// eslint-disable-next-line import/no-unresolved
import schema from 'schemaorg/data/releases/10.0/schemaorgcontext.jsonld?json';

const CONTEXTS = new Map([
  ['schema.org', schema],
]);

async function jsonldLoader(resource) {
  const url = new URL(resource);
  return {
    contextUrl: null,
    document: CONTEXTS.get(url.host),
    documentUrl: url,
  };
}

export default jsonldLoader;
