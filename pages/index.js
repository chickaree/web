import { useContext, useReducer, useEffect } from 'react';
import { useRouter } from 'next/router';
import { from } from 'rxjs';
import {
  switchMap,
  flatMap,
  map,
  bufferTime,
  filter,
} from 'rxjs/operators';
import { DateTime } from 'luxon';
import useReactor from '@cinematix/reactor';
import AppContext from '../context/app';
import fetchResource from '../utils/fetch-resource';
import getResponseData from '../utils/response/data';
import Layout from '../components/layout';
import Item from '../components/card/item';

function feedReactor(value$) {
  return value$.pipe(
    map(([feeds]) => feeds),
    switchMap((feeds) => from(feeds)),
    flatMap((feed) => fetchResource(feed)),
    flatMap((response) => getResponseData(response)),
    flatMap((context) => (
      from(context.orderedItems).pipe(
        flatMap(({ href }) => fetchResource(href)),
        flatMap((response) => getResponseData(response)),
        filter((item) => item.type !== 'OrderedCollection'),
        map((item) => ({ ...item, context })),
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

        acc.set(item.url, item);

        return acc;
      }, new Map()).values()],
    })),
  );
}

const initialState = {
  items: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'ITEMS_ADD':
      return {
        ...state,
        items: [...[
          ...state.items,
          ...action.payload,
        ].reduce((acc, item) => {
          acc.set(item.url, item);

          return acc;
        }, new Map()).values()].sort((a, b) => {
          const aDateTime = a.published
            ? DateTime.fromISO(a.published)
            : DateTime.fromMillis(0);
          const bDateTime = b.published
            ? DateTime.fromISO(b.published)
            : DateTime.fromMillis(0);

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
  const router = useRouter();
  const [app] = useContext(AppContext);
  const [state, dispatch] = useReducer(reducer, initialState);

  useReactor(feedReactor, dispatch, [app.following]);

  useEffect(() => {
    if (app.status === 'init') {
      return;
    }

    if (app.following.length > 0) {
      return;
    }

    router.push('/search');
  }, [
    app.status,
    app.following,
    router,
  ]);

  return (
    <Layout>
      <div className="container">
        <div className="row">
          <div className="mt-3 col-lg-8 offset-lg-2 col">
            {state.items.map((item) => (
              <Item key={item.url} resource={item} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}


export default Index;
