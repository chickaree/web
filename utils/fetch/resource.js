import { fromFetch } from 'rxjs/fetch';
import MIME_TYPES from '../mime-types';

function fetchResource(resource, init = {}) {
  const options = {
    ...init,
    headers: {
      Accept: MIME_TYPES.join(', '),
      ...init.headers || {},
    },
  };

  return fromFetch(resource, options);
}

export default fetchResource;
