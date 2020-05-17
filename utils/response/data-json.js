import getImageObj from '../image-obj';

async function getResponseDataJson(url, data) {
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
