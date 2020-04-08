function toArray(value) {
  if (typeof value === 'undefined') {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}

export default toArray;
