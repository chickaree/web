import { defer, from, of } from 'rxjs';
import { catchError, flatMap, map } from 'rxjs/operators';
import { fromFetch } from 'rxjs/fetch';
import { encode } from 'base64url';
import MIME_TYPES from '../mime-types';
import RESOURCE_CACHE from '../resource/cache';
import getMimeType from '../mime-type';

function generateAccept(mimeTypes) {
  const joined = mimeTypes.join(', ');

  // Max allowed CORS-safe length is 128.
  if (joined.length <= 128) {
    return joined;
  }

  return generateAccept(mimeTypes.slice(0, -1));
}

const accept = generateAccept(Array.from(MIME_TYPES));

function fetchResource(resource, init = {}) {
  const url = new URL(resource);

  // Only make requests over HTTPS.
  url.protocol = 'https:';

  const options = {
    ...init,
    headers: {
      Accept: accept,
      ...init.headers || {},
    },
  };

  return defer(() => {
    //  Start the cache opening.
    const resourceCache = caches.open(RESOURCE_CACHE).catch(() => undefined);

    // Attampt to make a HEAD request in order to determine CORS compatibility.
    return fromFetch(url, {
      ...options,
      method: 'HEAD',
    }).pipe(
      flatMap((headResponse) => {
        // If the head request returns a mimeType we can't handle, there is no need to make a GET.
        const mimeType = getMimeType(headResponse);

        if (!MIME_TYPES.has(mimeType)) {
          const clonedResponse = headResponse.clone();
          resourceCache.then((cache) => cache && cache.put(url, clonedResponse));
          return of(headResponse);
        }

        // Head Request was successful, make cross-origin request.
        return fromFetch(url, options).pipe(
          map((response) => {
            // Update the cache in the background.
            const clonedResponse = response.clone();
            resourceCache.then((cache) => cache && cache.put(url, clonedResponse));
            return response;
          }),
          catchError(() => (
            // If the main request fails, attempt to use the cache.
            from(resourceCache.then((cache) => cache && cache.match(url)))
          )),
        );
      }),
      catchError(() => {
        // Construct a proxy URL.
        const path = url.href.substr(url.origin.length);
        const hash = path === '/' ? '' : encode(path.substring(1));
        const remoteResource = `${url.host}${hash ? `/${hash}` : ''}`;

        // Try the proxy!
        return fromFetch(`https://chickar.ee/proxy/${remoteResource}`, options).pipe(
          map((response) => {
            // Update the cache in the background.
            const clonedResponse = response.clone();
            resourceCache.then((cache) => cache && cache.put(url, clonedResponse));
            return response;
          }),
          catchError(() => (
            // If the main request fails, attempt to use the cache.
            from(resourceCache.then((cache) => cache && cache.match(url)))
          )),
        );
      }),
    );
  });
}

export default fetchResource;
