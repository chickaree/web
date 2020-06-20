function createQueryAttribute(doc) {
  return (querySelector, attribute) => {
    const element = doc.querySelector(querySelector);
    return element && element.hasAttribute(attribute) ? element.getAttribute(attribute) : undefined;
  };
}

export default createQueryAttribute;
