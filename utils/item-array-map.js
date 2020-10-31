function itemArrayToMap(items) {
  return items.reduce((acc, item) => acc.set(item.id, item), new Map());
}

export default itemArrayToMap;
