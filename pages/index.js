import {
  useContext,
  useReducer,
  useMemo,
} from 'react';
import { from } from 'rxjs';
import {
  switchMap,
  flatMap,
  map,
  bufferTime,
  filter,
} from 'rxjs/operators';
import Link from 'next/link';
import { DateTime } from 'luxon';
import useReactor from '@cinematix/reactor';
import AppContext from '../context/app';
import Layout from '../components/layout';
import Item from '../components/card/item';
import fetchResourceData, { CACHE_FIRST_NETWORK_FALLBACK } from '../utils/fetch/resource-data';

function feedReactor(value$) {
  return value$.pipe(
    map(([feeds]) => feeds),
    switchMap((feeds) => from(feeds)),
    flatMap((feed) => fetchResourceData(feed, CACHE_FIRST_NETWORK_FALLBACK)),
    flatMap(({ orderedItems, ...context }) => (
      from(orderedItems || []).pipe(
        flatMap((item) => (
          fetchResourceData(item.url.href, CACHE_FIRST_NETWORK_FALLBACK).pipe(
            filter(({ type }) => type !== 'OrderedCollection'),
            map((data) => ({ ...item, ...data, context })),
          )
        )),
      )
    )),
    // Group by tick.
    bufferTime(0),
    filter((a) => a.length > 0),
    map((items) => ({
      type: 'ITEMS_ADD',
      payload: [...items.reduce((acc, item) => {
        if (!item) {
          return acc;
        }

        acc.set(item.url.href, item);

        return acc;
      }, new Map()).values()],
    })),
  );
}

const initialState = {
  items: [],
};

function getPublishedDateTime(item) {
  const published = item.published || item.updated;

  return published ? DateTime.fromISO(published) : DateTime.fromMillis(0);
}

function reducer(state, action) {
  switch (action.type) {
    case 'ITEMS_ADD':
      return {
        ...state,
        items: [...[
          ...state.items,
          ...action.payload,
        ].reduce((acc, item) => {
          acc.set(item.url.href, item);

          return acc;
        }, new Map()).values()].sort((a, b) => {
          const aDateTime = getPublishedDateTime(a);
          const bDateTime = getPublishedDateTime(b);

          return bDateTime.diff(aDateTime);
        }),
      };
    case 'RESET':
      return initialState;
    default:
      throw new Error('Invalid Action');
  }
}

function Index() {
  const [app] = useContext(AppContext);
  const [state, dispatch] = useReducer(reducer, initialState);

  useReactor(feedReactor, dispatch, [app.following]);

  const hasFeed = useMemo(() => {
    if (app.status === 'init') {
      return true;
    }

    if (app.following.length > 0) {
      return true;
    }

    return false;
  }, [
    app.status,
    app.following,
  ]);


  const items = useMemo(() => {
    // @TODO Keep "today" in state.
    const now = DateTime.local();

    // Only show items that are in the past
    // @TODO add some sort of setInterval to re-render when those items are past now.
    return state.items.filter((item) => {
      const published = getPublishedDateTime(item);

      return published < now;
    });
  }, [
    state.items,
  ]);

  if (!hasFeed) {
    return (
      <Layout>
        <div className="container min-vh-100">
          <div className="row pt-5 align-content-stretch align-items-center min-vh-100">
            <div className="mt-3 col-lg-8 offset-lg-2 col text-center">
              <h2>Welcome!</h2>
              <p>
                To get started, try <Link href="/search"><a>searching</a></Link> for feeds by name or by <Link href="/search"><a>providing</a></Link> a URL.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container pt-5">
        <div className="row">
          <div className="mt-3 col-lg-8 offset-lg-2 col">
            {items.map((item) => (
              <Item key={item.url.href} resource={item} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}


export default Index;
