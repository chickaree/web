import { frame } from 'jsonld';
import jsonldLoader from './jsonld-loader';

function jsonldFrame(json, href) {
  return frame(json, {
    '@context': 'https://schema.org',
    '@embed': '@always',
    mainEntityOfPage: href,
    mainEntity: {},
  }, {
    documentLoader: jsonldLoader,
  });
}

export default jsonldFrame;
