import getResponseUrl from './response-url';
import getSafeAssetUrl from './safe-asset-url';

async function getFeedDataFromJsonResponse(response) {
  const data = await response.json();
  const url = getResponseUrl(response);
  return {
    title: data.title || '',
    icon: getSafeAssetUrl(data.icon, url.toString()),
    feed_url: url.toString(),
    description: data.description || '',
  };
}

export default getFeedDataFromJsonResponse;
