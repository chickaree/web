import getSafeAssetUrl from '../safe-asset-url';
import getResponseUrl from '../response-url';

async function getResponseDataXML(response, doc) {
  const url = getResponseUrl(response);

  const root = doc.documentElement;

  if (root.tagName.toLowerCase() === 'channel') {
    return {
      type: 'feed',
      resource: {
        title: root.querySelector('> title').innerText,
        url: url.toString(),
        icon: getSafeAssetUrl(root.querySelector('> image > url').innerText, url.toString()),
        description: root.querySelector('> description').innerText,
      },
    };
  }

  if (root.tagName.toLowerCase() === 'feed') {
    return {
      type: 'feed',
      resource: {
        title: root.querySelector('> title').innerText,
        feed_url: url.toString(),
        icon: getSafeAssetUrl(root.querySelector('> icon').innerText, url.toString()),
        description: root.querySelector('> description').innerText,
      },
    };
  }

  throw new Error('Unkown XML Type');
}

export default getResponseDataXML;
