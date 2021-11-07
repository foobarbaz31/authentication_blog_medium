const showRandomImages = (data) => {
  const output = data.data.map(item => {
    return `<br/><img src=${item.assets.preview.url} alt=${item.description}/>`
  });
  return output.join("")
};

module.exports = {
  showRandomImages
};
