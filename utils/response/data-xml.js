import getSafeAssetUrl from '../safe-asset-url';
import getResponseUrl from '../response-url';
import createQueryText from '../query-text';

function createSafeUrl(doc, url) {
  return (querySelector) => {
    const element = doc.querySelector(querySelector);
    return element ? getSafeAssetUrl(element.textContent, url.toString()) : null;
  };
}

function createQueryAllText(doc) {
  return (querySelector) => {
    const nodes = doc.querySelectorAll(querySelector);
    return [...nodes.values()].map((n) => n.textContent);
  };
}

function createQueryAllAttribute(doc) {
  return (querySelector, attribute) => {
    const nodes = doc.querySelectorAll(querySelector);
    return [...nodes.values()].filter(
      (n) => !!n.hasAttribute(attribute),
    ).map(
      (n) => n.getAttribute(attribute),
    );
  };
}

async function getResponseDataXML(response, doc) {
  const url = getResponseUrl(response);

  const root = doc.documentElement.tagName;

  const text = createQueryText(doc);
  const textList = createQueryAllText(doc);
  const attributeList = createQueryAllAttribute(doc);
  const safeUrl = createSafeUrl(doc, url);

  if (root.toLowerCase() === 'rss') {
    return {
      type: 'feed',
      resource: {
        title: text('channel > title'),
        url: url.toString(),
        icon: safeUrl('channel > image > url'),
        description: text('channel > description'),
        items: textList('item > link'),
      },
    };
  }

  if (root.toLowerCase() === 'feed') {
    return {
      type: 'feed',
      resource: {
        title: text(':root > title'),
        url: url.toString(),
        icon: safeUrl(':root > icon'),
        description: text(':root > description') || text(':root > subtitle'),
        items: attributeList('entry > link', 'href'),
      },
    };
  }

  throw new Error('Unkown XML Type');
}

export default getResponseDataXML;
