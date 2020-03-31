import getResponseUrl from '../response-url';
import getSafeAssetUrl from '../safe-asset-url';

function getResponseDataJson(response, data) {
  const url = getResponseUrl(response);
  return {
    type: 'feed',
    resource: {
      url: url.toString(),
      title: data.title || '',
      icon: getSafeAssetUrl(data.icon, url.toString()),
      description: data.description || '',
    },
  };
}

export default getResponseDataJson;
