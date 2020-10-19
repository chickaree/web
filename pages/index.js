import {
  useContext,
  useReducer,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  from,
  concat,
  fromEvent,
  of,
} from 'rxjs';
import {
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
import createFetchResourceActivity, { CACHE_FIRST, REVALIDATE } from '../utils/fetch/resource-activity';
import UpdaterContext from '../context/updater';
import itemArrayToMap from '../utils/item-array-map';

const CONCURRENCY = 10;

function createFeedStream() {
  const fetchResourceActivity = createFetchResourceActivity();

  return (feeds, cacheStrategy) => (
    from(feeds).pipe(
      flatMap((feed) => fetchResourceActivity(feed, cacheStrategy), CONCURRENCY),
      flatMap(({ object }) => {
        const { orderedItems, ...context } = object;

        return from(orderedItems || []).pipe(
          flatMap((activity) => {
            const { object: item } = activity;

            if (activity.type === 'Remove') {
              return of(activity);
            }

            // Activity type is hinted as 'Create' or 'Update'
            return fetchResourceActivity(item.url.href, cacheStrategy).pipe(
              // On this page, discard nested OrderedCollections.
              filter((act) => act.object.type !== 'OrderedCollection'),
              map((act) => ({
                ...activity,
                ...act,
                object: {
                  ...item,
                  ...act.object,
                  context,
                },
              })),
            );
          }, CONCURRENCY),
        );
      }),
    )
  );
}

function feedReactor(value$) {
  const feedStream = createFeedStream();

  return value$.pipe(
    map(([status, feeds]) => ({ status, feeds })),
    filter(({ status }) => status === 'ready'),
    filter(({ feeds }) => feeds.length > 0),
    flatMap(({ feeds }, index) => {
      if (index === 0) {
        return concat(
          feedStream(feeds, CACHE_FIRST),
          feedStream(feeds, REVALIDATE),
        );
      }


      return feedStream(feeds, REVALIDATE);
    }),
    // Group by tick.
    bufferTime(0),
    filter((a) => a.length > 0),
    map((activityStream) => ({
      type: 'ITEMS_ACTIVITY',
      payload: activityStream,
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

// @TODO How should we deal with items that don't have a URL?
function activityReducer(state, activity) {
  const { object, type } = activity;

  switch (type) {
    case 'Create':
    case 'Update':
      return state.set(object.url.href, object);
    case 'Remove':
      state.delete(object.url.href);
      return state;
    default:
      throw new Error('Invalid Activity');
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'ITEMS_ACTIVITY':
      return {
        ...state,
        items: [
          ...action.payload.reduce(activityReducer, itemArrayToMap(state.items)).values(),
        ].sort((a, b) => {
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
  const autoUpdater = useContext(UpdaterContext);
  const [state, dispatch] = useReducer(reducer, initialState);
  const followingRef = useRef(app.following);
  const statusRef = useRef(app.status);

  const subject = useReactor(feedReactor, dispatch, [
    app.status,
    app.following,
  ]);

  // Update a reference to the current state.
  useEffect(() => {
    followingRef.current = app.following;
    statusRef.current = app.status;
  }, [
    app.following,
    app.status,
  ]);

  const refresh = useCallback(() => {
    subject.next([statusRef.current, followingRef.current]);
  }, [
    subject,
    followingRef,
    statusRef,
  ]);

  useEffect(() => {
    // Refresh the feed when someone comes back to the tab (if they are scrolled to the top).
    const obs = fromEvent(document, 'visibilitychange').pipe(
      filter(() => document.visibilityState === 'visible'),
      filter(() => window.scrollY === 0),
    ).subscribe(() => {
      // If the app needs updating, do that instead.
      if (autoUpdater()) {
        return;
      }

      refresh();
    });

    return () => obs.unsubscribe();
  }, [
    refresh,
    autoUpdater,
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

  if (app.status === 'ready' && app.following.length === 0) {
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
    <Layout onRefresh={refresh}>
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
