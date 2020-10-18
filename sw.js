import { registerRoute } from 'workbox-routing';
import { precacheAndRoute } from 'workbox-precaching';
import { NetworkFirst } from 'workbox-strategies';

// eslint-disable-next-line no-underscore-dangle,no-restricted-globals
precacheAndRoute(self.__WB_MANIFEST);

// eslint-disable-next-line no-restricted-globals
addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    // eslint-disable-next-line no-restricted-globals
    self.skipWaiting();
  }
});

registerRoute(
  ({ request }) => (request.mode === 'navigate'),
  new NetworkFirst(),
);
