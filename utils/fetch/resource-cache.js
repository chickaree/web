import { defer, from } from 'rxjs';
import { defaultIfEmpty, filter, flatMap } from 'rxjs/operators';
import RESOURCE_CACHE from '../resource/cache';

function fetchResourceFromCache(resource) {
  return defer(() => (
    from(caches.open(RESOURCE_CACHE)).pipe(
      filter((cache) => !!cache),
      flatMap((cache) => cache.match(resource)),
      defaultIfEmpty(undefined),
    )
  ));
}

export default fetchResourceFromCache;
