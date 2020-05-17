import getResponseDataJson from './data-json';
import getResponseDataHTML from './data-html';
import getResponseDataXML from './data-xml';

export const MIME_TYPES = [
  'application/json',
  'application/rss+xml',
  'application/atom+xml',
  'text/html',
  'text/xml',
  'application/xml',
  'application/xhtml+xml',
];

async function getResponseData(response) {
  if (!response.headers.has('Content-Type')) {
    return null;
  }

  // @TODO Get data from Link headers

  let mimeType = response.headers.get('Content-Type').split(';').shift().trim();

  if (!MIME_TYPES.includes(mimeType)) {
    return null;
  }

  if (mimeType === 'application/json') {
    return getResponseDataJson(response);
  }

  // DOMParser does not support rss/atom
  if (['application/rss+xml', 'application/atom+xml'].includes(mimeType)) {
    mimeType = 'application/xml';
  }

  const text = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, mimeType);

  if (doc instanceof HTMLDocument) {
    return getResponseDataHTML(response, doc);
  }
  if (doc instanceof XMLDocument) {
    return getResponseDataXML(response, doc);
  }

  return null;
}

export default getResponseData;
