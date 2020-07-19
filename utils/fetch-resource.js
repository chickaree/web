import { encode } from 'base64url';
import { of } from 'rxjs';
import { catchError, flatMap } from 'rxjs/operators';
import { fromFetch } from 'rxjs/fetch';
import MIME_TYPES from './mime-types';
import getMimeType from './mime-type';

function fetchResource(resource, init = {}) {
  const options = {
    ...init,
    headers: {
      Accept: MIME_TYPES.join(', '),
      ...init.headers || {},
    },
  };

  return fromFetch(resource, {
    ...options,
    method: 'HEAD',
  }).pipe(
    flatMap((response) => {
      // If the head request returns a mimeType we can't handle, there is no need to make a GET.
      const mimeType = getMimeType(response);

      if (!MIME_TYPES.includes(mimeType)) {
        return of(response);
      }

      return fromFetch(resource, options);
    }),
    catchError(() => {
      const url = new URL(resource);
      const path = url.href.substr(url.origin.length);
      const hash = path === '/' ? '' : encode(path.substring(1));
      const remoteResource = `${url.host}${hash ? `/${hash}` : ''}`;
      // Try the proxy!
      return fromFetch(`https://chickar.ee/proxy/${remoteResource}`, options);
    }),
  );
}

export default fetchResource;
