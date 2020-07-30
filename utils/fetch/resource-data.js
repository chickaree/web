import {
  of, EMPTY, from, concat,
} from 'rxjs';
import {
  flatMap, filter, toArray, defaultIfEmpty,
} from 'rxjs/operators';
import getResponseData from '../response/data';
import fetchResource from './resource';
import RESOURCE_CACHE from '../resource/cache';

// Retrieve cached version, or network version on failure.
export const CACHE_FIRST = 'CACHE_FIRST';

// Retrieve a new version, or nothing.
export const REVALIDATE = 'REVALIDATE';

// Retrieve network version, or cached version on failure.
export const NETWORK_FIRST = 'NETWORK_FIRST';

function createFetchFromCache() {
  const cacheOpen = typeof caches !== 'undefined' ? caches.open(RESOURCE_CACHE) : Promise.resolve();

  return (resource) => (
    from(cacheOpen).pipe(
      filter((cache) => !!cache),
      flatMap((cache) => cache.match(resource)),
      defaultIfEmpty(undefined),
    )
  );
}

function createFetchResourceData() {
  const fetchFromCache = createFetchFromCache();

  return (resource, cacheStrategy = CACHE_FIRST) => {
    switch (cacheStrategy) {
      case CACHE_FIRST:
        return fetchFromCache(resource).pipe(
          flatMap((response) => {
            // If it was not in the cache, return from the network.
            if (!response) {
              return fetchResource(resource);
            }

            return of(response);
          }),
          filter((response) => !!response || !!response.ok),
          flatMap((response) => getResponseData(response)),
        );
      case REVALIDATE:
        return concat(
          fetchFromCache(resource),
          fetchResource(resource),
        ).pipe(
          toArray(),
          flatMap(([cached, current]) => {
            if (!cached && !current) {
              return EMPTY;
            }

            if (!current || !current.ok) {
              return EMPTY;
            }

            if (!cached || !cached.ok) {
              return getResponseData(current);
            }

            return concat(
              getResponseData(cached),
              getResponseData(current),
            ).pipe(
              toArray(),
              filter(([cachedDate, currentData]) => {
                if (JSON.stringify(cachedDate) === JSON.stringify(currentData)) {
                  return EMPTY;
                }

                // @TODO When this happens, send an Activity to delete certain items.
                //       in fact, it might be better to only send activity...

                return of(currentData);
              }),
            );
          }),
        );
      case NETWORK_FIRST:
        // Cache fallback is handled by the service worker.
        return fetchResource(resource).pipe(
          flatMap((response) => {
            if (!response || !response.ok) {
              return EMPTY;
            }

            return getResponseData(response);
          }),
        );
      default:
        throw new Error('Invalid Cache Strategy');
    }
  };
}

export default createFetchResourceData;