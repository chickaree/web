import { DateTime } from 'luxon';
import getImageObj from '../image-obj';
import objectUri from '../object-uri';

async function getResponseDataJson(url, data) {
  return {
    id: url.toString(),
    type: 'OrderedCollection',
    url: {
      type: 'Link',
      href: url.toString(),
      mediaType: 'application/json',
    },
    name: data.title || '',
    icon: getImageObj(data.icon, url),
    summary: data.description || '',
    orderedItems: (data.items || []).map(({
      title,
      url: href,
      image,
      date_published: published,
      date_modified: modified,
      summary,
    }) => ({
      id: href || objectUri(title),
      type: 'Object',
      name: title,
      url: href ? {
        type: 'Link',
        href,
      } : undefined,
      image: getImageObj(image, url),
      published: published ? DateTime.fromISO(published).toUTC().toISO() : undefined,
      updated: modified ? DateTime.fromISO(modified).toUTC().toISO() : undefined,
      summary,
    })),
  };
}

export default getResponseDataJson;
