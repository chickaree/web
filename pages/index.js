import {
  useContext,
  useReducer,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import {
  from,
  fromEvent,
  merge,
  EMPTY,
  of,
} from 'rxjs';
import {
  flatMap,
  map,
  bufferTime,
  filter,
  distinctUntilChanged,
  switchMap,
} from 'rxjs/operators';
import Link from 'next/link';
import { DateTime } from 'luxon';
import useReactor from '@cinematix/reactor';
import AppContext from '../context/app';
import Layout from '../components/layout';
import Item from '../components/card/item';
import UpdaterContext from '../context/updater';
import itemArrayToMap from '../utils/item-array-map';
import DatabaseContext from '../context/db';
import getResponseData from '../utils/response/data';
import fetchResource from '../utils/fetch/resource';
import wrapObject from '../utils/wrap-obj';

const STATUS_INIT = 'init';
const STATUS_READY = 'ready';

const ACTIVITY_CREATE = 'Create';
const ACTIVITY_UPDATE = 'Update';
const ACTIVITY_REMOVE = 'Remove';

const ITEMS_ACTIVITY = 'ITEMS_ACTIVITY';
const ITEMS_SET = 'ITEMS_SET';
const RESET = 'RESET';

function feedRefresher(value$) {
  return value$.pipe(
    switchMap(({ feeds, items }) => {
      const feedSet = new Set(feeds);
      const itemMap = items.reduce((acc, item) => (
        acc.set(item.context.url.href, [
          ...(acc.get(item.context.url.href) || []),
          item,
        ])
      ), new Map());

      // Remove items that are no longer in the list of feeds.
      const remove = [...itemMap.entries()].reduce((acc, [feedUrl, feedItems]) => {
        if (feedSet.has(feedUrl)) {
          return acc;
        }

        return [
          ...acc,
          ...feedItems.map((item) => wrapObject(item, ACTIVITY_REMOVE)),
        ];
      }, []);

      return merge(
        from(remove),
        from(feeds).pipe(
          flatMap((feed) => fetchResource(feed)),
          flatMap((response) => getResponseData(response)),
          flatMap((object) => {
            const { orderedItems, ...context } = object;
            const cachedItems = itemArrayToMap(itemMap.get(object.url.href) || []);
            const currentItems = itemArrayToMap(orderedItems || []);

            // If there are no orderedItems returned, then remove everything.
            if (currentItems.size === 0) {
              return from(
                [...cachedItems.values()].map((item) => wrapObject(item, ACTIVITY_REMOVE)),
              );
            }

            const removing = [...cachedItems.keys()].filter((x) => !currentItems.has(x));
            const adding = [...currentItems.keys()].filter((x) => !cachedItems.has(x));

            // If we not adding or removing anything, we may assume the feed has not changed.
            if (adding.length === 0 && removing.length === 0) {
              return EMPTY;
            }

            // Since the feed has been updated, we'll take the oppertunity to update everything
            // that isn't being removed.
            return merge(
              from(removing.map((id) => wrapObject(cachedItems.get(id), ACTIVITY_REMOVE))),
              from(orderedItems || []).pipe(
                flatMap((item) => {
                  // Deal with embeded items.
                  if (!item.url) {
                    if (!cachedItems.has(item.id)) {
                      return of(wrapObject({
                        ...item,
                        context,
                      }, ACTIVITY_CREATE));
                    }

                    if (JSON.stringify(cachedItems.get(item.id)) !== JSON.stringify(item)) {
                      return of(wrapObject({
                        ...item,
                        context,
                      }, ACTIVITY_UPDATE));
                    }

                    return EMPTY;
                  }

                  return fetchResource(item.url.href).pipe(
                    flatMap((response) => getResponseData(response)),
                    map((updatedItem) => (
                      wrapObject(
                        {
                          ...item,
                          ...updatedItem,
                          // Use the id from the feed, which may be different from what is returned
                          // on the object itself (ugh). This allows the items to be looked up
                          // easeir later.
                          id: item.id || updatedItem.id,
                          context,
                        },
                        cachedItems.has(updatedItem.id) ? ACTIVITY_UPDATE : ACTIVITY_CREATE,
                      )
                    )),
                  );
                }),
              ),
            );
          }),
        ),
      ).pipe(
        // Group by tick.
        bufferTime(0),
        filter((a) => a.length > 0),
        map((activityStream) => ({
          type: ITEMS_ACTIVITY,
          payload: activityStream,
        })),
      );
    }),
  );
}

function feedReactor(value$) {
  return value$.pipe(
    map(([appStatus, feeds, status, items]) => ({
      appStatus, status, feeds, items,
    })),
    filter(({ appStatus, status }) => (
      appStatus === STATUS_READY && status === STATUS_READY
    )),
    distinctUntilChanged((x, y) => x.feeds === y.feeds),
    feedRefresher,
  );
}

const initialState = {
  status: STATUS_INIT,
  items: [],
};

function getPublishedDateTime(item) {
  const published = item.published || item.updated;

  return published ? DateTime.fromISO(published) : DateTime.fromMillis(0);
}

function activityReducer(state, activity) {
  const { object, type } = activity;

  switch (type) {
    case ACTIVITY_CREATE:
    case ACTIVITY_UPDATE:
      return state.set(object.id, object);
    case ACTIVITY_REMOVE:
      state.delete(object.id);
      return state;
    default:
      throw new Error('Invalid Activity');
  }
}

function reducer(state, action) {
  switch (action.type) {
    case ITEMS_SET:
      return {
        ...state,
        status: STATUS_READY,
        items: action.payload,
      };
    case ITEMS_ACTIVITY:
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
    case RESET:
      return initialState;
    default:
      throw new Error('Invalid Action');
  }
}

function Index() {
  const [app] = useContext(AppContext);
  const db = useContext(DatabaseContext);
  const autoUpdater = useContext(UpdaterContext);
  const [state, dispatch] = useReducer(reducer, initialState);

  const dispatcher = useCallback((action) => {
    // Update the database.
    if (action.type === ITEMS_ACTIVITY) {
      action.payload.forEach(({ type, object }) => {
        switch (type) {
          case ACTIVITY_CREATE:
          case ACTIVITY_UPDATE:
            db.feed.put({
              ...object,
              published: object.published
                ? DateTime.fromISO(object.published).toJSDate()
                : undefined,
            });
            break;
          case ACTIVITY_REMOVE:
            db.feed.delete(object.id);
            break;
          default:
            throw new Error('Invalid Activity');
        }
      });
    }

    return dispatch(action);
  }, [
    db,
  ]);

  useReactor(feedReactor, dispatcher, [
    app.status,
    app.following,
    state.status,
    state.items,
  ]);

  const subject = useReactor(feedRefresher, dispatcher);

  const refresh = useCallback(() => {
    subject.next({
      feeds: app.following,
      items: state.items,
    });
  }, [
    subject,
    app.following,
    state.items,
  ]);

  useEffect(() => {
    if (!db) {
      return;
    }

    db.feed.orderBy('published').reverse().toArray().then((items) => (
      dispatch({
        type: ITEMS_SET,
        payload: items.map((item) => ({
          ...item,
          published: item.published ? DateTime.fromJSDate(item.published).toISO() : undefined,
        })),
      })
    ));
  }, [
    db,
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
      if (item.type === 'OrderedCollection') {
        return false;
      }

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
              <Item key={item.id} resource={item} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}


export default Index;
