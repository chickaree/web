function createQueryText(doc) {
  return (querySelector) => {
    const element = doc.querySelector(querySelector);
    return element ? element.textContent : undefined;
  };
}

export default createQueryText;
