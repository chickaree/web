// @TODO How should we deal with items that don't have a URL?
function itemArrayToMap(items) {
  return items.reduce((acc, item) => acc.set(item.url.href, item), new Map());
}

export default itemArrayToMap;
