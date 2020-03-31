import { useReducer } from 'react';
import { useRouter } from 'next/router';
import { decode } from 'base64url';
import useReactor from '@cinematix/reactor';
import {
  of, concat, EMPTY, from,
} from 'rxjs';
import { switchMap, filter, flatMap } from 'rxjs/operators';
import getResourceLinkData from '../utils/resource-link-data';
import fetchResource from '../utils/fetch-resource';
import getResponseUrl from '../utils/response-url';
import Website from '../components/resource/website';
import Layout from '../components/layout';
import Feed from '../components/resource/feed';
import getResponseData from '../utils/response/data';

const initialState = {
  type: null,
  resource: {},
};

function reducer(state, action) {
  switch (action.type) {
    case 'RESOURCE_SET':
      console.log('ACTION', action);
      return {
        ...state,
        type: action.payload.type,
        resource: action.payload.resource,
      };
    case 'RESET':
      return initialState;
    default:
      throw new Error();
  }
}

function resourceReactor(value$) {
  return value$.pipe(
    filter(([domain]) => !!domain),
    switchMap(([domain, hash]) => {
      const path = hash ? `/${decode(hash)}` : '/';
      const resource = `https://${domain}${path}`;

      return concat(
        of({ type: 'RESET' }),
        fetchResource(resource).pipe(
          flatMap((response) => {
            const url = getResponseUrl(response);

            // If the repsonse was redirected, preform the redirect locally as well.
            if (response.redirected) {
              return of({
                type: 'REDIRECT',
                payload: getResourceLinkData(url.toString()),
              });
            }

            if (!response.headers.has('Content-Type')) {
              // @TODO Throw some sort of error.
              return EMPTY;
            }

            return from(getResponseData(response)).pipe(
              flatMap((payload) => of({
                type: 'RESOURCE_SET',
                payload,
              })),
            );
          }),
        ),
      );
    }),
  );
}

function Resource() {
  const router = useRouter();
  const { resource } = router.query;
  const [domain, hash] = resource || [];

  const [state, dispatch] = useReducer(reducer, initialState);

  useReactor(resourceReactor, (action) => {
    // Redirect action uses the router rather than the reducer.
    if (action.type === 'REDIRECT') {
      router.replace(action.payload.href, action.payload.as);
    } else {
      dispatch(action);
    }
  }, [domain, hash]);

  let content;
  switch (state.type) {
    case 'website':
      content = <Website resource={state.resource} />;
      break;
    case 'feed':
      content = <Feed resource={state.resource} />;
      break;
    default:
      content = null;
      break;
  }

  return (
    <Layout>
      {content}
    </Layout>
  );
}

export default Resource;
