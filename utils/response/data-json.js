import getResponseUrl from '../response-url';
import getImageObj from '../image-obj';

function getResponseDataJson(response, data) {
  const url = getResponseUrl(response);
  return {
    type: 'OrderedCollection',
    url: url.toString(),
    name: data.title || '',
    icon: getImageObj(data.icon, url),
    summary: data.description || '',
    // @TODO handle embeded objects.
    orderedItems: (data.items || []).map((item) => ({
      type: 'Link',
      href: item.url,
    })),
  };
}

export default getResponseDataJson;
