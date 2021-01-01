import { useReducer, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import useReactor from '@cinematix/reactor';
import {
  EMPTY, of, from, animationFrameScheduler,
} from 'rxjs';
import {
  flatMap,
  switchMap,
  map,
  distinctUntilChanged,
  debounceTime,
  filter,
  bufferTime,
  defaultIfEmpty,
} from 'rxjs/operators';
import { fromFetch } from 'rxjs/fetch';
import { Message } from '@wikimedia/react.i18n';
import Layout from '../components/layout';
import fetchResource from '../utils/fetch/resource';
import getResponseData from '../utils/response/data';
import MIME_TYPES from '../utils/mime-types';
import Item from '../components/card/item';
import getResourceLinkData from '../utils/resource/link-data';

const initialState = {
  resources: [],
};

const RESOURCES_SET = 'RESOURCES_SET';
const RESOURCES_ADD = 'RESOURCES_ADD';

function reducer(state, action) {
  switch (action.type) {
    case RESOURCES_SET:
      return {
        ...state,
        resources: action.payload,
      };
    case RESOURCES_ADD: {
      // Merge and remove any duplicates.
      const resources = [...[...state.resources, ...action.payload].reduce((acc, resource) => {
        acc.set(resource.url.href, resource);
        return acc;
      }, new Map()).values()].sort((a, b) => a.position - b.position);

      return {
        ...state,
        resources,
      };
    }
    default:
      throw new Error(`Uknown Action: ${action.type}`);
  }
}

const OFFICIAL_WEBSITE = 'P856';
const LANGUAGE = 'P407';

// @TODO Use users language!
const ENGLISH = 'Q1860';

function searchReactor(value$) {
  return value$.pipe(
    map(([v]) => v),
    distinctUntilChanged(),
    debounceTime(250),
    switchMap((v) => {
      if (!v) {
        return of({
          type: RESOURCES_SET,
          payload: [],
        });
      }
      // Value is a URL
      try {
        const url = new URL(v);
        return fetchResource(url).pipe(
          filter((response) => response && response.ok),
          flatMap((response) => getResponseData(response)),
          map((resource) => ({
            type: RESOURCES_SET,
            payload: resource ? [resource] : [],
          })),
        );
      } catch (error) {
        // Value is not a URL.
        return of(v).pipe(
          flatMap((value) => {
            const url = new URL('https://www.wikidata.org/w/api.php');
            url.searchParams.set('action', 'query');
            url.searchParams.set('format', 'json');
            url.searchParams.set('list', 'search');
            url.searchParams.set('formatversion', 2);
            url.searchParams.set('srinfo', '');
            url.searchParams.set('srprop', '');
            url.searchParams.set('srenablerewrites', 1);
            url.searchParams.set('origin', '*');
            url.searchParams.set('srsearch', `haswbstatement:${OFFICIAL_WEBSITE} ${value}`);

            return fromFetch(url);
          }),
          flatMap((response) => response.json()),
          flatMap((data) => {
            if (!data.query) {
              return of({
                type: RESOURCES_SET,
                payload: [],
              });
            }

            if (!data.query.search || data.query.search.length === 0) {
              return of({
                type: RESOURCES_SET,
                payload: [],
              });
            }

            return from(data.query.search.map(({ title }) => {
              const claimURL = new URL('https://www.wikidata.org/w/api.php');
              claimURL.searchParams.set('action', 'wbgetclaims');
              claimURL.searchParams.set('format', 'json');
              claimURL.searchParams.set('origin', '*');
              claimURL.searchParams.set('formatversion', 2);
              claimURL.searchParams.set('entity', title);
              claimURL.searchParams.set('property', OFFICIAL_WEBSITE);
              claimURL.searchParams.set('props', '');

              return claimURL;
            })).pipe(
              flatMap((claimURL, index) => (
                fromFetch(claimURL).pipe(
                  flatMap((r) => r.json()),
                  flatMap((claimSet) => {
                    if (
                      !claimSet
                          || !claimSet.claims
                          || !claimSet.claims[OFFICIAL_WEBSITE]
                    ) {
                      return EMPTY;
                    }

                    return from(claimSet.claims[OFFICIAL_WEBSITE].filter((c) => {
                      if (c.type === 'deprecated') {
                        return false;
                      }

                      if (c.qualifiers && c.qualifiers[LANGUAGE]) {
                        const langs = c.qualifiers[LANGUAGE].map((q) => (
                          q.datavalue.value.id
                        ));

                        if (!langs.includes(ENGLISH)) {
                          return false;
                        }
                      }

                      try {
                        const url = new URL(c.mainsnak.datavalue.value);
                        return !!url;
                      } catch (e) {
                        return false;
                      }
                    }).sort((a, b) => {
                      if (a.rank === 'preferred') {
                        return 1;
                      }

                      if (b.rank === 'preferred') {
                        return -1;
                      }

                      return 0;
                    }).map((c) => c.mainsnak.datavalue.value));
                  }),
                  flatMap((url, i) => (
                    fetchResource(url).pipe(
                      flatMap((response) => {
                        if (!response || !response.ok) {
                          return EMPTY;
                        }

                        return getResponseData(response);
                      }),
                      filter(({ type }) => type === 'OrderedCollection'),
                      map((resource) => ({
                        ...resource,
                        position: (index * 1000) + i,
                      })),
                    )
                  )),
                )
              )),
              // Group by frame.
              bufferTime(0, animationFrameScheduler),
              filter((a) => a.length > 0),
              map((resources, i) => {
                const payload = resources.sort((a, b) => a.position - b.position);
                if (i === 0) {
                  return {
                    type: RESOURCES_SET,
                    payload,
                  };
                }

                return {
                  type: RESOURCES_ADD,
                  payload,
                };
              }),
              defaultIfEmpty({
                type: RESOURCES_SET,
                payload: [],
              }),
            );
          }),
        );
      }
    }),
  );
}

function Search() {
  const router = useRouter();
  const { q } = router.query;
  const [state, dispatch] = useReducer(reducer, initialState);

  useReactor(searchReactor, dispatch, [q]);

  const handleChange = useCallback(({ target }) => {
    const query = {};

    if (target.value) {
      query.q = target.value;
    }

    router.replace({
      pathname: '/search',
      query,
    });
  }, [
    router,
  ]);

  const handleSubmit = useCallback((event) => {
    event.preventDefault();

    try {
      const url = new URL(q);
      const { as, href } = getResourceLinkData(url);
      router.push(href, as);
    } catch (e) {
      // Do nothing.
    }
  }, [
    q,
    router,
  ]);

  const { collections, items } = useMemo(() => (
    state.resources.reduce((acc, resource) => {
      if (resource.type === 'OrderedCollection') {
        // Exclude collections that cannot be handled.
        if (MIME_TYPES.has(resource.url.mediaType)) {
          acc.collections = [
            ...acc.collections,
            resource,
          ];
        }
      } else {
        acc.items = [
          ...acc.items,
          resource,
        ];
      }

      return acc;
    }, { collections: [], items: [] })
  ), [
    state.resources,
  ]);

  return (
    <Layout>
      <div className="container pt-5">
        <div className="row">
          <div className="mt-3 col-lg-8 offset-lg-2 col">
            <form className="mb-3" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="q"><h2><Message id="search-label" /></h2></label>
                <input
                  className="form-control form-control-lg bg-transparent text-primary"
                  type="text"
                  name="q"
                  id="q"
                  autoComplete="off"
                  value={q || ''}
                  onChange={handleChange}
                />
                <small className="form-text text-muted"><Message id="search-help" /></small>
              </div>
            </form>
            {collections.map((item) => (
              <Item key={item.id} resource={item} />
            ))}
            {items.map((item) => (
              <Item key={item.id} resource={item} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Search;
