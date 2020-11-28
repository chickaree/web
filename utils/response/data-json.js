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
    name: typeof data.title === 'string' ? data.title : undefined,
    icon: getImageObj(data.icon, url),
    summary: data.description || '',
    orderedItems: (data.items || []).map(({
      id: entryId,
      title,
      url: href,
      image,
      date_published: published,
      date_modified: modified,
      summary,
    }) => {
      let id;
      if (entryId) {
        try {
          const uri = (new URL(entryId)).toString();
          id = uri;
        } catch (e) {
          // Silence is golden.
        }
      }

      if (!id) {
        id = href || objectUri(title);
      }

      return {
        id,
        type: 'Object',
        name: typeof title === 'string' ? title : undefined,
        url: href ? {
          type: 'Link',
          href,
        } : undefined,
        image: getImageObj(image, url),
        published: published ? DateTime.fromISO(published).toUTC().toISO() : undefined,
        updated: modified ? DateTime.fromISO(modified).toUTC().toISO() : undefined,
        summary,
      };
    }),
  };
}

export default getResponseDataJson;
