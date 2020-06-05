import { useReducer } from 'react';
import { useRouter } from 'next/router';
import { decode } from 'base64url';
import useReactor from '@cinematix/reactor';
import {
  of, concat, EMPTY, from,
} from 'rxjs';
import { switchMap, filter, flatMap } from 'rxjs/operators';
import getResourceLinkData from '../utils/resource/link-data';
import fetchResource from '../utils/fetch-resource';
import getResponseUrl from '../utils/response-url';
import Layout from '../components/layout';
import getResponseData from '../utils/response/data';
import Collection from '../components/resource/collection';
import Item from '../components/resource/item';
import Meta from '../components/meta';

const initialState = {
  resource: {},
};

function reducer(state, action) {
  switch (action.type) {
    case 'RESOURCE_SET':
      return {
        ...state,
        resource: action.payload,
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
      let init = {
        type: 'RESET',
      };

      const element = document.getElementById('resource');
      if (element) {
        const { dataset } = element;
        if (
          element.tagName === 'SCRIPT'
          && dataset.domain === domain
          && dataset.hash === (hash || '')
        ) {
          try {
            init = {
              type: 'RESOURCE_SET',
              payload: JSON.parse(element.innerText),
            };
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
          }
        }
      }

      const path = hash ? `/${decode(hash)}` : '/';
      const resource = `https://${domain}${path}`;

      return concat(
        of(init),
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

            // @TODO Redirect based on the Caonical and
            //       get the manifest data.

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
  switch (state.resource.type) {
    case 'OrderedCollection':
      content = <Collection resource={state.resource} />;
      break;
    case 'Article':
      content = <Item resource={state.resource} />;
      break;
    default:
      content = null;
      break;
  }

  return (
    <Layout>
      <Meta resource={state.resource} />
      {content}
    </Layout>
  );
}

export default Resource;
