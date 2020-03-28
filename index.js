import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import routes from './.next/routes-manifest.json';

async function getNotFoundResponse(url, event) {
  const notFoundResponse = await getAssetFromKV(event, {
    mapRequestToAsset: (req) => new Request((new URL('/404.html', url.origin)).toString(), req),
  });

  return new Response(notFoundResponse.body, { ...notFoundResponse, status: 404 });
}

async function handleEvent(event) {
  const url = new URL(event.request.url);

  try {
    return await getAssetFromKV(event);
  } catch (e) {
    const match = routes.dynamicRoutes.find(({ regex }) => (url.pathname.match(regex)));

    if (match) {
      try {
        return await getAssetFromKV(event, {
          mapRequestToAsset: (req) => new Request((new URL(`${match.page}.html`, url.origin)).toString(), req),
        });
      } catch (error) {
        return getNotFoundResponse(url, event);
      }
    }

    return getNotFoundResponse(url, event);
  }
}

// eslint-disable-next-line no-restricted-globals
addEventListener('fetch', (event) => {
  event.respondWith(handleEvent(event));
});
