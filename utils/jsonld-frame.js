import { frame } from 'jsonld';
import jsonldLoader from './jsonld-loader';

function jsonldFrame(json, url) {
  return frame(json, {
    '@context': 'https://schema.org',
    url,
  }, {
    documentLoader: jsonldLoader,
  });
}

export default jsonldFrame;
