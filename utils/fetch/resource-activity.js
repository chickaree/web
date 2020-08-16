import {
  of, EMPTY, from, concat,
} from 'rxjs';
import {
  flatMap, filter, toArray, defaultIfEmpty, map,
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

function wrapObject(object, activityType = 'Create') {
  const { type } = object;

  switch (type) {
    case 'OrderedCollection':
      return {
        type: activityType,
        object: {
          ...object,
          orderedItems: (object.orderedItems || []).map((item) => wrapObject(item)),
        },
      };
    default:
      return {
        type: activityType,
        object,
      };
  }
}

function createFetchResourceActivity() {
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
          map((data) => wrapObject(data)),
        );
      case REVALIDATE:
        return concat(
          fetchFromCache(resource),
          fetchResource(resource),
        ).pipe(
          toArray(),
          flatMap(([cached, current]) => {
            // If neither the cached or the current version is availble and ok, then nothing can be
            // done.
            if ((!cached || !cached.ok) && (!current || !current.ok)) {
              return EMPTY;
            }

            // If there was no cached object, then we are creating it.
            if (!cached || !cached.ok) {
              return from(getResponseData(current)).pipe(
                map((data) => wrapObject(data)),
              );
            }

            // If the current object is not available, then we are removing it.
            if (!current || !current.ok) {
              return from(getResponseData(cached)).pipe(
                map((data) => wrapObject(data, 'Remove')),
              );
            }

            return concat(
              getResponseData(cached),
              getResponseData(current),
            ).pipe(
              toArray(),
              flatMap(([cachedData, currentData]) => {
                // If they are identical, then we aren't doing anything.
                if (JSON.stringify(cachedData) === JSON.stringify(currentData)) {
                  return EMPTY;
                }

                // If the current object is an OrderedCollection, deal with the items inside the
                // collection, rather than the collection itself
                if (currentData.type === 'OrderedCollection') {
                  const cachedItems = cachedData.orderedItems || [];
                  const currentItems = currentData.orderedItems || [];

                  const create = currentItems.filter((currentItem) => (
                    !cachedItems.some((cachedItem) => currentItem.url.href === cachedItem.url.href)
                  ));

                  const update = cachedItems.filter((cachedItem) => {
                    const currentItem = cachedItems.find((item) => (
                      item.url.href === cachedItem.url.href
                    ));

                    if (!currentItem) {
                      return false;
                    }

                    if (JSON.stringify(cachedItem) === JSON.stringify(currentItem)) {
                      return false;
                    }

                    return true;
                  });

                  const remove = cachedItems.filter((cachedItem) => (
                    !currentItems.some((currentItem) => (
                      cachedItem.url.href === currentItem.url.href
                    ))
                  ));

                  return of({
                    type: 'Update',
                    object: {
                      ...currentData,
                      orderedItems: [
                        ...create.map((item) => wrapObject(item, 'Create')),
                        ...update.map((item) => wrapObject(item, 'Update')),
                        ...remove.map((item) => wrapObject(item, 'Remove')),
                      ],
                    },
                  });
                }

                return of(wrapObject(currentData, 'Update'));
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
          map((data) => wrapObject(data)),
        );
      default:
        throw new Error('Invalid Cache Strategy');
    }
  };
}

export default createFetchResourceActivity;
