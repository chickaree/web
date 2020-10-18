import getResponseDataJson from './data-json';
import getResponseDataHTML from './data-html';
import getResponseDataXML from './data-xml';
import getResponseUrl from '../response-url';
import MIME_TYPES from '../mime-types';
import getMimeType from '../mime-type';

async function getResponseData(response) {
  const url = getResponseUrl(response);

  // @TODO Get data from Link headers

  let mimeType = getMimeType(response);

  if (mimeType === '') {
    return {
      type: 'Object',
      url: {
        type: 'Link',
        href: url,
      },
    };
  }

  if (!MIME_TYPES.has(mimeType)) {
    return {
      type: 'Object',
      url: {
        type: 'Link',
        href: url,
        mediaType: mimeType,
      },
    };
  }

  if (mimeType === 'application/json') {
    const data = await response.json();
    return getResponseDataJson(url, data);
  }

  // DOMParser does not support rss/atom
  if (['application/rss+xml', 'application/atom+xml'].includes(mimeType)) {
    mimeType = 'application/xml';
  }

  const text = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, mimeType);

  if (mimeType === 'text/html') {
    return getResponseDataHTML(url, doc);
  }

  return getResponseDataXML(url, doc);
}

export default getResponseData;
