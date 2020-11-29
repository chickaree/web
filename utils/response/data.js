import getResponseDataJson from './data-json';
import getResponseDataHTML from './data-html';
import getResponseDataXML from './data-xml';
import getResponseUrl from '../response-url';
import MIME_TYPES from '../mime-types';
import getMimeType from '../mime-type';

const JSON_TYPES = new Set(['application/feed+json', 'application/json']);
const XML_LIKE = new Set(['application/rss+xml', 'application/atom+xml']);

function getEmptyObject(href, mediaType) {
  const id = (new URL(href)).toString();

  let url = {
    type: 'Link',
    href: id,
  };

  if (mediaType !== '') {
    url = {
      ...url,
      mediaType,
    };
  }

  return {
    id,
    type: 'Object',
    url,
  };
}

async function getResponseData(response) {
  const url = getResponseUrl(response);

  // @TODO Get data from Link headers

  let mimeType = getMimeType(response);

  if (mimeType === '' || !MIME_TYPES.has(mimeType)) {
    return getEmptyObject(url, mimeType);
  }

  if (JSON_TYPES.has(mimeType)) {
    try {
      const data = await response.json();
      return getResponseDataJson(url, data);
    } catch (e) {
      return getEmptyObject(url, mimeType);
    }
  }

  // DOMParser does not support rss/atom
  if (XML_LIKE.has(mimeType)) {
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
