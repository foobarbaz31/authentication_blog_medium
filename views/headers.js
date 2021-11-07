const headers = (isLoggedIn = false, name = null) => {
  const welcomeHeader = isLoggedIn ? `Welcome ${name}` : `<a href="login">Login</a>`;
  const showRandomImages = `<br/><a href="showRandomImages">Show Random Images</a><br/>`;
  const showViewCollectionsLink = isLoggedIn ? `
    <br/>
      <a href="logout">Log Out</a>
    <br/>
      <a href="viewCollections">Show my collections</a>
    <br/>
  ` : '';
  return `
      ${welcomeHeader}
      ${showRandomImages}
      ${showViewCollectionsLink}
  `
}

module.exports = {
  headers
}