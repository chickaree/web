import getResponseUrl from '../response-url';
import getSafeAssetUrl from '../safe-asset-url';

function getResponseDataJson(response, data) {
  const url = getResponseUrl(response);
  return {
    type: 'feed',
    resource: {
      url: url.toString(),
      canonical: data.feed_url,
      title: data.title || '',
      icon: getSafeAssetUrl(data.icon, url.toString()),
      description: data.description || '',
      items: (data.items || []).map((item) => item.url),
    },
  };
}

export default getResponseDataJson;
