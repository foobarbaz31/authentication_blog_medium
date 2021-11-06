const headers = (isLoggedIn = false, name = null) => {
  const welcomeHeader = isLoggedIn ? `Welcome ${name}` : `<a href="login">Login</a>`
  const showViewCollectionsLink = isLoggedIn ? `
    <br/>
      <a href="logout">Log Out</a>
    <br/>
      <a href="viewCollections">Show my collections</a>
    <br/>
  ` : '';
  return `
    <body>
      ${welcomeHeader}
      ${showViewCollectionsLink}
    </body>
  `
}

module.exports = {
  headers
}