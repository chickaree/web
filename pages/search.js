import { useReducer } from 'react';
import { useRouter } from 'next/router';
import useReactor from '@cinematix/reactor';
import { flatMap, switchMap, map, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import Layout from '../components/layout';
import fetchResource from '../utils/fetch-resource';
import getResponseData from '../utils/response/data';
import Item from '../components/card/item';

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

  return (
    <Layout>
      <div className="container">
        <div className="row">
          <div className="mt-3 col-lg-8 offset-lg-2 col">
            <form className="mb-3">
              <div className="form-group">
                <label htmlFor="search">Search</label>
                <input
                  className="form-control form-control-lg bg-transparent text-primary"
                  type="url"
                  name="search"
                  id="search"
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  value={q || ''}
                  onChange={({ target }) => router.replace({ pathname: '/search', query: { q: target.value } })}
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