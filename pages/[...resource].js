import { useReducer } from 'react';
import { useRouter } from 'next/router';
import cherrio from 'cheerio';
import { decode } from 'base64url';
import useReactor from '@cinematix/reactor';
import {
  of, defer, concat, EMPTY,
} from 'rxjs';
import { switchMap, filter, flatMap } from 'rxjs/operators';
import getResourceLinkData from '../utils/resource-link-data';
import getSafeAssetUrl from '../utils/safe-asset-url';
import fetchResource from '../utils/fetch-resource';
import getResponseUrl from '../utils/response-url';
import Website from '../components/resource/website';
import Layout from '../components/layout';

async function getDataFromHTMLResponse(response) {
  const url = getResponseUrl(response);
  const data = await response.text();

  const $ = cherrio.load(data);

  const head = $('head');
  let sitename = $('meta[property="og:site_name"], meta[name="og:site_name"]', head).last().attr('content');
  if (!sitename) {
    sitename = $('meta[name="application-name"]', head).last().attr('content');
  }
  if (!sitename) {
    sitename = $('title', head).last().text();
  }
  let description = $('meta[property="og:description"], meta[name="og:description"]', head).last().attr('content');
  if (!description) {
    description = $('meta[name="description"]', head).last().attr('content');
  }
  const banner = $('meta[property="og:image"], meta[name="og:image"]', head).last().attr('content');
  const icons = $('link[rel="icon"], link[rel="apple-touch-icon"]', head).toArray().map(({ attribs }) => attribs).filter((link) => !!link.href)
    .sort((a, b) => {
    // Prefer larger.
      if (!a.sizes || !b.sizes) {
        return 0;
      }

      const aSize = parseInt(a.sizes.split('x')[0], 10);
      const bSize = parseInt(b.sizes.split('x')[0], 10);

      return bSize - aSize;
    });

  const feeds = $('link[rel="alternate"]').toArray().map((link, index) => ({
    ...link.attribs,
    order: index,
  })).filter((feed) => {
    // If the feed is missing an href, it should not be considered.
    if (!feed.href) {
      return false;
    }

    // Only include feeds that are types we know how to deal with.
    if (!feed.type || !['application/json', 'application/rss+xml'].includes(feed.type)) {
      return false;
    }

    return true;
  })
    .sort((a, b) => {
    // Prefer JSON.
      if (!a.type || !b.type) {
        return 0;
      }

      if (a.type === b.type) {
        return 0;
      }

      if (a.type === 'application/json') {
        return -1;
      }

      if (b.type === 'application/json') {
        return 1;
      }

      return 0;
    })
    .reduce((acc, feed) => {
    // Dedupe the feeds by the title.
      if (acc.find((f) => f.title === feed.title)) {
        return acc;
      }

      return [
        ...acc,
        feed,
      ];
    }, [])
    .sort((a, b) => a.order - b.order)
    .map((feed) => ({
      ...feed,
      href: feed.href ? new URL(feed.href, url).toString() : null,
    }));

  return {
    type: 'website',
    resource: {
      sitename,
      description,
      banner: banner ? getSafeAssetUrl(banner, url.toString()) : null,
      icon: icons.length > 0 ? getSafeAssetUrl(icons[0].href, url.toString()) : null,
      feeds,
    },
  };
}

const initialState = {
  type: null,
  resource: {},
};

function reducer(state, action) {
  switch (action.type) {
    case 'RESOURCE_SET':
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

            if (response.headers.get('Content-Type').includes('text/html')) {
              return defer(() => getDataFromHTMLResponse(response)).pipe(
                flatMap((payload) => of({
                  type: 'RESOURCE_SET',
                  payload,
                })),
              );
            }

            // @TODO Throw some sort of error.
            return EMPTY;
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
