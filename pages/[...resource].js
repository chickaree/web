import { useReducer, useMemo } from 'react';
import { useRouter } from 'next/router';
import { decode } from 'base64url';
import useReactor from '@cinematix/reactor';
import {
  of, concat, from,
} from 'rxjs';
import {
  switchMap, filter, flatMap, map,
} from 'rxjs/operators';
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
          filter((response) => !!response.ok),
          flatMap((response) => {
            const url = getResponseUrl(response);

            // If the repsonse was redirected, preform the redirect locally as well.
            if (response.redirected) {
              return of({
                type: 'REDIRECT',
                payload: getResourceLinkData(url.toString()),
              });
            }

            // @TODO Redirect based on the Caonical and
            //       get the manifest data.

            // @TODO handle the an error thrown by getResponseData().

            return from(getResponseData(response)).pipe(
              map((payload) => ({
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

  const res = JSON.stringify(state.resource);

  const meta = useMemo(() => (
    <Meta resource={state.resource} />
  ), [
    res,
  ]);

  const content = useMemo(() => {
    switch (state.resource.type) {
      case 'OrderedCollection':
        return <Collection resource={state.resource} />;
      case 'Article':
        return <Item resource={state.resource} />;
      default:
        return null;
    }
  }, [
    // Deep comparison
    res,
  ]);

  return (
    <Layout backButton>
      {meta}
      {content}
    </Layout>
  );
}

export default Resource;
