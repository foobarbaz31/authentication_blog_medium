const listCollectionNames = (data) => {
  const output = data.data.map(item => {
    return `<li>${item.name}</li>`
  });
  return `<p>My Collections</p><br/><ul>${output.join("")}</ul>`;
};

module.exports = {
  listCollectionNames
};
