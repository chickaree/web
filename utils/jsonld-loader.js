import schema from '../contexts/schema.json';

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
