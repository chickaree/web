import {
  useContext,
  useReducer,
  useEffect,
  useMemo,
} from 'react';
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
import useHomeEnabled from '../hooks/home-enabled';

function feedReactor(value$) {
  return value$.pipe(
    map(([feeds]) => feeds),
    switchMap((feeds) => from(feeds)),
    flatMap((feed) => fetchResource(feed)),
    flatMap((response) => getResponseData(response)),
    flatMap(({ orderedItems, ...context }) => (
      from(orderedItems).pipe(
        flatMap((item) => (
          fetchResource(item.url).pipe(
            flatMap((response) => getResponseData(response)),
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

        acc.set(item.url, item);

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
          acc.set(item.url, item);

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
  const router = useRouter();
  const [app] = useContext(AppContext);
  const isHomeEnabled = useHomeEnabled();
  const [state, dispatch] = useReducer(reducer, initialState);

  useReactor(feedReactor, dispatch, [app.following]);

  useEffect(() => {
    if (isHomeEnabled) {
      return;
    }

    router.replace('/search');
  }, [
    isHomeEnabled,
    router,
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

  return (
    <Layout>
      <div className="container">
        <div className="row">
          <div className="mt-3 col-lg-8 offset-lg-2 col">
            {items.map((item) => (
              <Item key={item.url} resource={item} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}


export default Index;
