import getResponseUrl from '../response-url';
import createQueryText from '../query-text';
import getImageObj from '../image-obj';

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

async function getResponseDataXML(url, doc) {
  const root = doc.documentElement.tagName;

  const text = createQueryText(doc);
  const textList = createQueryAllText(doc);
  const attributeList = createQueryAllAttribute(doc);

  if (root.toLowerCase() === 'rss') {
    return {
      type: 'OrderedCollection',
      name: text('channel > title'),
      url: url.toString(),
      icon: getImageObj(text('channel > image > url'), url),
      summary: text('channel > description'),
      // @TODO handle embeded objects.
      orderedItems: textList('item > link').map((href) => ({
        type: 'Link',
        href,
      })),
    };
  }

  if (root.toLowerCase() === 'feed') {
    return {
      type: 'OrderedCollection',
      name: text(':root > title'),
      url: url.toString(),
      icon: getImageObj(text(':root > icon'), url),
      summary: text(':root > description') || text(':root > subtitle'),
      // @TODO handle embeded objects.
      orderedItems: attributeList('entry > link', 'href').map((href) => ({
        type: 'Link',
        href,
      })),
    };
  }

  throw new Error('Unkown XML Type');
}

export default getResponseDataXML;
