const express = require('express')
const app = express()
const port = 3000;
const axios = require("axios");
const addRequestId = require('express-request-id')();
var jwt = require('jwt-simple');

const { headers } = require('./views/headers');

const clientId = 'HU4E8ef03E1wJi2XhHgpWt8rETUuEUsU';
const clientSecret = 'kZMJW6ir5XJd4djR';
const APIURL = 'https://api.shutterstock.com/v2';

const cookieParser = require('cookie-parser');

app.use(addRequestId);
app.use(cookieParser());

/**
 * Function to simply encode data object that we will on the cookie
 * @param {*} accessToken 
 * @param {*} refreshToken 
 * @param {*} expiresIn 
 * @param {*} userDetails 
 * @param {*} clientSecret 
 */
function encodeCookies(accessToken, refreshToken, expiresIn, userDetails, clientSecret) {
  return jwt.encode({
    accessToken,
    refreshToken,
    tokenIssuedTimestamp: Math.round(new Date() / 1000),
    expiresIn,
    user: userDetails
  }, clientSecret);
}

/**
 * Express middleware to check if the user is logged in. This determination is made by checking if the cookie "myTestApp" is present
 */
const isUserLoggedIn = (req, res, next) => {
  const cookieData = req.cookies.myTestApp;
  if (cookieData) {
    // implies user is logged in
    req.isLoggedIn = true;
    // get username
    const decodedCookies = jwt.decode(cookieData, clientSecret);
    req.user = decodedCookies.user;
    req.shutterstockAccessToken = decodedCookies.accessToken;
    req.tokenIssuedTimestamp = decodedCookies.tokenIssuedTimestamp;
    req.expiresIn = decodedCookies.expiresIn;
    req.refreshToken = decodedCookies.refreshToken;
  } else {
    req.isLoggedIn = false;
  }
  next();
};

/**
 * Express middleware to check if the current user access token has expired or is about to expire in next 100ms.
 * If so, we attempt to get a new access token using the "refresh_token" grant type and exchanging refresh token for access token
 */
const updateAccessToken = async (req, res, next) => {
  const { tokenIssuedTimestamp, expiresIn, refreshToken, user } = req;
  console.log(`tokenIssuedTimeStamp ${tokenIssuedTimestamp}`);
  const currentTimeStamp = Math.round(new Date() / 1000);

  if (currentTimeStamp - tokenIssuedTimestamp > (expiresIn - 100)) {
    console.log(`${clientId} ${clientSecret} ${refreshToken}`)
    // Since an hour as passed, we should update the access token using the refresh token and re-update the cookies
    const body = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    };
    const { data: 
      { 
        access_token: newAccessToken, 
      }
    } = await axios.post(`${APIURL}/oauth/access_token`, body);
    // now that we have new accessToken, let's update it on cookies and the request
    req.shutterstockAccessToken = newAccessToken;
    res.cookie('myTestApp', encodeCookies(newAccessToken, refreshToken, expiresIn, user, clientSecret));
  } 
  next();
};

/**
 * Entry point for our application 
 */
app.get('/', isUserLoggedIn, (req, res) => {
  if (req.isLoggedIn) {
    res.send(headers(true, req.user.username))
  } else {
    res.send(headers(false))
  }
});

/**
 * Login endpoint of our application. Upon accessing this endpoint we get redirected to Shutterstock's login page
 */
app.get('/login', async (req, res) => {
  const response  = await axios.get(`${APIURL}/oauth/authorize`, {
    params: {
      scope: 'user.view collections.view collections.edit',
      state: 'demo_' + Math.round(new Date() / 1000),
      response_type: 'code',
      redirect_uri: 'http://localhost:3000/myoauth2',
      client_id: clientId
    },
    maxRedirects: 0,
    validateStatus: (status) => status < 400
  });
  const shutterstockAccountsUrl = response.data.split('Moved Temporarily. Redirecting to ')[1];
  res.redirect(shutterstockAccountsUrl);
});

/**
 * If the user is successfully able to login to Shutterstock, Shutterstock returns the user to this endpoint 
 *    (which was defined in redirect_uri key in tie above request) along with an authorization_code
 * At this point the authentication is successful and user can now fetch access tokens and refresh tokens to perform operations
 * Users can fetch these tokens by using the "authorization_code" grant type and passing the code received from the returned callback
 */
app.get('/myoauth2', async(req, res) => {
  const { code } = req.query;

  // Using the code returned upon successful login to Shutterstock website, get the access token and refresh tokens that represent
  const body = {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code: code,
    expires: true
  };

  const { data: 
    { 
      access_token: accessToken, 
      expires_in: expiresIn,
      token_type: tokenType,
      refresh_token: refreshToken
    }
  } = await axios.post(`${APIURL}/oauth/access_token`, body);
  const { data: userDetails } = await axios.get(`${APIURL}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  // Setting this on the cookie will allow us to keep the user logged in
  res.cookie('myTestApp', encodeCookies(accessToken, refreshToken, expiresIn, userDetails, clientSecret));
  res.redirect('/');
});

/**
 * We simulate a user log out by simply wiping out the "myTestApp" cookie
 */
app.get('/logout', (req, res) => {
  res.clearCookie('myTestApp');
  res.redirect('/')
});

/**
 * This endpoint allows user to fetch their collections
 * If user is logged in and their acceess toke is valid, then we get the data and dump it on the browser
 * If user is not logged in (verified by "isUserLoggedIn"), user is redirected to "/" page
 * If user is logged in but access token has expired (verified by "updateAccessToken"), we first fetch new token and then fetch the users' collections
 */
app.get('/viewCollections', isUserLoggedIn, updateAccessToken, async (req, res) => {
  console.log(`shutterstockAccessToken ` + JSON.stringify(req.shutterstockAccessToken, null, 2))
  try {
    const response = await axios.get(`${APIURL}/images/collections`, {
      headers: {
        Authorization: `Bearer ${req.shutterstockAccessToken}`
      }
    });
    res.send(JSON.stringify(response.data, null, 2))
  } catch(e) {
    console.log(`Error ${e}`)
    console.log(JSON.stringify(e.response.data, null, 2))
    res.status(404).send('Bad bad')
  }
})

/**
 * Starts the express app on port 3000
 */
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})