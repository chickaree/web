import { registerRoute } from 'workbox-routing';
import { precacheAndRoute } from 'workbox-precaching';
import { encode } from 'base64url';
import getMimeType from './utils/mime-type';
import MIME_TYPES from './utils/mime-types';

// eslint-disable-next-line no-underscore-dangle,no-restricted-globals
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request }) => request.mode === 'cors',
  async ({ url, request, event }) => {
    //  Start the cache opening.
    const cacheOpen = caches.open('resource');

    try {
      const headResponse = await fetch(request, {
        method: 'HEAD',
      });

      // If the head request returns a mimeType we can't handle, there is no need to make a GET.
      const mimeType = getMimeType(headResponse);

      if (!MIME_TYPES.includes(mimeType)) {
        const cache = await cacheOpen;
        event.waitUntil(cache.put(request, headResponse.clone()));
        return headResponse;
      }

      // Head Request was successful, make cross-origin request.
      try {
        const response = await fetch(request);
        const cache = await cacheOpen;
        event.waitUntil(cache.put(request, response.clone()));
        return response;
      } catch (e) {
        // If the main request fails, attempt to use the cache.
        const cache = await cacheOpen;
        return cache.get(request);
      }
    } catch (error) {
      // Construct a proxy URL.
      const path = url.href.substr(url.origin.length);
      const hash = path === '/' ? '' : encode(path.substring(1));
      const remoteResource = `${url.host}${hash ? `/${hash}` : ''}`;

      // Try the proxy!
      try {
        const response = await fetch(new Request(`https://chickar.ee/proxy/${remoteResource}`, request));
        const cache = await cacheOpen;
        event.waitUntil(cache.put(request, response.clone()));
        return response;
      } catch (e) {
        // If the main request fails, attempt to use the cache.
        const cache = await cacheOpen;
        return cache.get(request);
      }
    }
  },
);
