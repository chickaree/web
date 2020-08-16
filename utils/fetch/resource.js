import { fromFetch } from 'rxjs/fetch';
import MIME_TYPES from '../mime-types';

function fetchResource(resource, init = {}) {
  const url = new URL(resource);

  // Only make requests over HTTPS.
  url.protocol = 'https:';

  const options = {
    ...init,
    headers: {
      Accept: MIME_TYPES.join(', '),
      ...init.headers || {},
    },
  };

  return fromFetch(url, options);
}

export default fetchResource;
