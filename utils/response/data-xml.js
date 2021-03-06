import { DateTime } from 'luxon';
import createQueryText from '../query-text';
import getImageObj from '../image-obj';
import createQueryAttribute from '../query-attr';
import objectUri from '../object-uri';

class XMLTypeError extends Error {
  constructor(url, document) {
    super('Unkown XML Type');
    this.url = url;
    this.document = document;
  }
}

async function getResponseDataXML(url, doc) {
  const root = doc.documentElement.tagName;
  const text = createQueryText(doc);

  if (root.toLowerCase() === 'rss') {
    const items = [...(doc.querySelectorAll('item').values())];

    return {
      id: url.toString(),
      type: 'OrderedCollection',
      name: text('channel > title'),
      url: {
        type: 'Link',
        href: url.toString(),
        mediaType: 'application/xml',
      },
      icon: getImageObj(text('channel > image > url'), url),
      summary: text('channel > description'),
      orderedItems: items.map((el) => {
        const itemText = createQueryText(el);

        const pubDate = itemText('pubDate');
        const link = itemText('link');
        const href = link ? (new URL(link, url)).toString() : undefined;

        const name = itemText('title');

        const guid = itemText('guid');
        let id;
        if (guid) {
          try {
            const uri = (new URL(guid)).toString();
            id = uri;
          } catch (e) {
            // Since is golden.
          }
        }

        if (!id) {
          id = href || objectUri(name);
        }

        return {
          id,
          type: 'Object',
          name,
          published: pubDate ? DateTime.fromRFC2822(pubDate).toUTC().toISO() : undefined,
          url: href ? {
            type: 'Link',
            href,
          } : undefined,
          summary: itemText('description'),
        };
      }),
    };
  }

  if (root.toLowerCase() === 'feed') {
    const items = [...(doc.querySelectorAll('entry').values())];

    return {
      id: url.toString(),
      type: 'OrderedCollection',
      name: text(':root > title'),
      url: {
        type: 'Link',
        href: url.toString(),
        mediaType: 'application/xml',
      },
      icon: getImageObj(text(':root > icon'), url),
      summary: text(':root > description') || text(':root > subtitle'),
      orderedItems: items.map((el) => {
        const itemText = createQueryText(el);
        const itemAttribute = createQueryAttribute(el);

        const published = itemText('published');
        const updated = itemText('updated');
        const link = itemAttribute('link', 'href');
        const href = link ? (new URL(link, url)).toString() : undefined;
        const name = itemText('title');

        const entryId = itemText('id');
        let id;
        if (entryId) {
          try {
            const uri = (new URL(entryId)).toString();
            id = uri;
          } catch (e) {
            // Since is golden.
          }
        }

        if (!id) {
          id = href || objectUri(name);
        }

        return {
          id,
          type: 'Object',
          name,
          published: published ? DateTime.fromISO(published).toUTC().toISO() : undefined,
          updated: updated ? DateTime.fromISO(updated).toUTC().toISO() : undefined,
          url: href ? {
            type: 'Link',
            href,
          } : undefined,
          summary: itemText('summary'),
        };
      }),
    };
  }

  throw new XMLTypeError(url, doc);
}

export default getResponseDataXML;
