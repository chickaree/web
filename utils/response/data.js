import getResponseDataJson from './data-json';
import getResponseDataHTML from './data-html';
import getResponseDataXML from './data-xml';

async function getResponseData(response) {
  if (!response.headers.has('Content-Type')) {
    return null;
  }

  const mimeType = response.headers.get('Content-Type').split(';').shift().trim();
  if (mimeType === 'application/json') {
    const data = await response.json();
    return getResponseDataJson(response, data);
  }

  const text = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, mimeType);

  if (doc instanceof Document) {
    return getResponseDataHTML(response, doc);
  }
  if (doc instanceof XMLDocument) {
    return getResponseDataXML(response, doc);
  }

  return null;
}

export default getResponseData;
