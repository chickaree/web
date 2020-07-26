import {
  of, EMPTY, from, concat,
} from 'rxjs';
import {
  flatMap, catchError, filter, toArray,
} from 'rxjs/operators';
import getResponseData from '../response/data';
import fetchResource from './resource';

// Retrieve cached version, or network version on failure.
export const CACHE_FIRST_NETWORK_FALLBACK = 'CACHE_FIRST_NETWORK_FALLBACK';

// Retrieve a new version, or nothing.
export const REVALIDATE = 'REVALIDATE';

// Retrieve network version, or cached version on failure.
export const NETWORK_FIRST_CACHE_FALLBACK = 'NETWORK_FIRST_CACHE_FALLBACK';

const RESOURCE_CACHE = 'resource';

function fetchFromCache(resource) {
  return from(caches.open(RESOURCE_CACHE)).pipe(
    flatMap((cache) => cache.match(resource)),
  );
}

function fetchResourceData(resource, cacheStrategy = CACHE_FIRST_NETWORK_FALLBACK) {
  switch (cacheStrategy) {
    case CACHE_FIRST_NETWORK_FALLBACK:
      return fetchFromCache(resource).pipe(
        flatMap((response) => {
          // If it was not in the cache, return from the network.
          if (!response) {
            return fetchResource(resource);
          }

          return of(response);
        }),
        filter((response) => !!response.ok),
        flatMap((response) => getResponseData(response)),
      );
    case REVALIDATE:
      return concat(
        fetchFromCache(resource),
        fetchResource(resource).pipe(
          catchError(() => of(undefined)),
        ),
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

              return of(currentData);
            }),
          );
        }),
      );
    case NETWORK_FIRST_CACHE_FALLBACK:
      return fetchResource(resource).pipe(
        catchError(() => fetchFromCache(resource)),
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
}

export default fetchResourceData;
