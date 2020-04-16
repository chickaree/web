import { frame } from 'jsonld';
import jsonldLoader from './jsonld-loader';

function jsonldFrame(json, match = {}) {
  return frame(json, {
    '@context': 'https://schema.org',
    ...match,
  }, {
    documentLoader: jsonldLoader,
  });
}

export default jsonldFrame;
