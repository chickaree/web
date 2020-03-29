import { encode } from 'base64url';
import { catchError } from 'rxjs/operators';
import { fromFetch } from 'rxjs/fetch';

function fetchResource(resource, init = {}) {
  const options = {
    ...init,
    headers: {
      Accept: 'application/activity+json, application/ld+json, application/json, application/rss+xml, application/xml, text/xml, text/html',
      ...init.headers || {},
    },
  };

  return fromFetch(resource, options).pipe(
    catchError(() => {
      const url = new URL(resource);
      const path = url.href.substr(url.origin.length);
      const hash = path === '/' ? '' : encode(path.substring(1));
      const remoteResource = `${url.host}${hash ? `/${hash}` : ''}`;
      // Try the proxy!
      return fromFetch(`https://chickar.ee/api/${remoteResource}`, options);
    }),
  );
}

export default fetchResource;
