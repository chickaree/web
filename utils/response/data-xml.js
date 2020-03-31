import getSafeAssetUrl from '../safe-asset-url';
import getResponseUrl from '../response-url';
import createQueryText from '../query-text';

function createSafeUrl(doc, url) {
  return (querySelector) => {
    const element = doc.querySelector(querySelector);
    return element ? getSafeAssetUrl(element.textContent, url.toString()) : null;
  };
}

async function getResponseDataXML(response, doc) {
  const url = getResponseUrl(response);

  const root = doc.documentElement.tagName;

  const text = createQueryText(doc);
  const safeUrl = createSafeUrl(doc, url);

  if (root.toLowerCase() === 'rss') {
    return {
      type: 'feed',
      resource: {
        title: text('channel > title'),
        url: url.toString(),
        icon: safeUrl('channel > image > url'),
        description: text('channel > description'),
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
      },
    };
  }

  throw new Error('Unkown XML Type');
}

export default getResponseDataXML;
