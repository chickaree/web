import { frame } from 'jsonld';
import jsonldLoader from './jsonld-loader';

async function jsonldFrame(json, href) {
  const data = await frame(json, {
    '@context': 'https://schema.org',
    url: href,
  }, {
    documentLoader: jsonldLoader,
  });

  if (data['@graph'] || data.url) {
    return data;
  }

  // If nothing was returned, try again with http.
  const url = new URL(href);
  url.protocol = 'http:';
  return frame(json, {
    '@context': 'https://schema.org',
    url: url.toString(),
  }, {
    documentLoader: jsonldLoader,
  });
}

export default jsonldFrame;
