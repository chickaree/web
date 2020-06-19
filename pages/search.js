import { useReducer, useCallback } from 'react';
import { useRouter } from 'next/router';
import useReactor from '@cinematix/reactor';
import {
  flatMap,
  switchMap,
  map,
  distinctUntilChanged,
  debounceTime,
} from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import Layout from '../components/layout';
import fetchResource from '../utils/fetch-resource';
import getResponseData from '../utils/response/data';
import Item from '../components/card/item';
import getResourceLinkData from '../utils/resource/link-data';

const initialState = {
  resource: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'RESOURCE_SET':
      return {
        ...state,
        resource: action.payload,
      };
    default:
      throw new Error(`Uknown Action: ${action.type}`);
  }
}

function searchReactor(value$) {
  return value$.pipe(
    map(([v]) => v),
    distinctUntilChanged(),
    debounceTime(250),
    switchMap((v) => {
      try {
        const url = new URL(v);
        return fetchResource(url).pipe(
          flatMap((response) => getResponseData(response)),
          map((resource) => ({
            type: 'RESOURCE_SET',
            payload: resource,
          })),
        );
      } catch (e) {
        return EMPTY;
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
    router.replace({
      pathname: '/search',
      query: { q: target.value },
    });
  }, [
    router,
  ]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();

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

  return (
    <Layout>
      <div className="container">
        <div className="row">
          <div className="mt-3 col-lg-8 offset-lg-2 col">
            <form className="mb-3" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="q">Search</label>
                <input
                  className="form-control form-control-lg bg-transparent text-primary"
                  type="url"
                  name="q"
                  id="q"
                  value={q || ''}
                  onChange={handleChange}
                />
                <small className="form-text text-muted">URL</small>
              </div>
            </form>
            <Item resource={state.resource} />
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Search;
