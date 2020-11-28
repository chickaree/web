import {
  useReducer,
  useCallback,
  useRef,
  useEffect,
  useState,
} from 'react';
import Dexie from 'dexie';
import { ulid } from 'ulid';
import { DateTime } from 'luxon';
import { Workbox, messageSW } from 'workbox-window';
import { useRouter } from 'next/router';
import { IntlProvider } from '@wikimedia/react.i18n';
import AppContext from '../context/app';
import '../styles/styles.scss';
import UpdaterContext from '../context/updater';
import DatabaseContext from '../context/db';
import PrompterContext from '../context/prompter';
import en from '../i18n/en.json';

const FOLLOWING = 'following';

const STATUS_INIT = 'init';
const STATUS_READY = 'ready';
const FOLLOWING_SET = 'FOLLOWING_SET';
const FOLLOW = 'FOLLOW';
const UNFOLLOW = 'UNFOLLOW';

const initialState = {
  status: STATUS_INIT,
  following: [],
};

async function loadFollowing(db) {
  try {
    const activity = await db.activity.where('type').anyOf('Follow', 'Undo').toArray();

    return [...activity.reduce((map, { type, id, object }) => {
      switch (type) {
        case 'Follow':
          map.set(id, object.href);
          return map;
        case 'Undo':
          if (map.has(object.id)) {
            map.delete(object.id);
          }
          return map;
        default:
          return map;
      }
    }, new Map()).values()];
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return [];
  }
}

function reducer(state, action) {
  switch (action.type) {
    case FOLLOWING_SET:
      return {
        ...state,
        status: STATUS_READY,
        following: Array.from(new Set([...state.following, ...action.payload])),
      };
    case FOLLOW:
      return {
        ...state,
        following: Array.from(new Set([...state.following, action.payload])),
      };
    case UNFOLLOW:
      return {
        ...state,
        following: state.following.filter((href) => href !== action.payload),
      };
    default:
      throw new Error('Unkown Action');
  }
}

function Chickaree({ Component, pageProps }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const waitingSwRef = useRef();
  const [database, setDatabase] = useState();
  const [prompter, setPrompter] = useState();

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setPrompter(e);
    });

    const db = new Dexie('Chickaree', {
      autoOpen: false,
    });

    db.version(1).stores({
      // @TODO We should remove the auto-incrementing when Dexie supports it.
      activity: '++id, type, published, object.id, object.type, object.href',
    });

    db.version(2).stores({
      // Add feed store.
      feed: 'id, published, url.href, context.url.href',
    }).upgrade((transaction) => (
      transaction.activity.toCollection().modify((activity) => {
        // Change published from ISO string to JS Date.
        // eslint-disable-next-line no-param-reassign
        activity.published = DateTime.fromISO(activity.published).utc().toJSDate();
      })
    ));

    db.open().then((openedDb) => {
      setDatabase(openedDb);
      loadFollowing(openedDb).then((feeds) => {
        dispatch({
          type: FOLLOWING_SET,
          payload: feeds,
        });
      });
    }).catch(() => {
      dispatch({
        type: FOLLOWING_SET,
        payload: JSON.parse(('localStorage' in window ? window.localStorage.getItem(FOLLOWING) : null) || '[]'),
      });
    });

    // Do not register the service worker in development.
    if (!process.env.DEV && 'serviceWorker' in navigator) {
      const wb = new Workbox('/sw.js');

      const handleWaiting = ({ sw, target }) => {
        waitingSwRef.current = sw;
        // Register the controlling event to reload the page.
        target.addEventListener('controlling', () => {
          router.reload();
        });
      };

      wb.addEventListener('waiting', handleWaiting);
      wb.addEventListener('externalwaiting', handleWaiting);

      wb.register();
    }
  }, []);

  const autoUpdater = useCallback(() => {
    if (!waitingSwRef.current) {
      return false;
    }

    messageSW(waitingSwRef.current, { type: 'SKIP_WAITING' });
    return true;
  }, [
    waitingSwRef,
  ]);

  // @TODO This is a good idea in theory, but in practice it refreshes the page when the user is
  //       still typing in the search box. :(
  // useEffect(() => {
  //   router.events.on('routeChangeComplete', autoUpdater);

  //   return () => {
  //     router.events.off('routeChangeComplete', autoUpdater);
  //   };
  // }, [
  //   router,
  //   autoUpdater,
  // ]);

  // Intercept a dispatch and convert it to an action to be saved in IndexedDB.
  const dispatcher = useCallback((action) => {
    if (database && [FOLLOW, UNFOLLOW].includes(action.type)) {
      const id = `https://chickar.ee/activity/${ulid().toLowerCase()}`;
      const published = DateTime.utc().toJSDate();

      if (action.type === FOLLOW) {
        database.activity.add({
          id,
          type: 'Follow',
          object: {
            type: 'Link',
            href: action.payload,
          },
          published,
        });
      } else if (action.type === UNFOLLOW) {
        database.activity
          .where('object.href').equals(action.payload)
          .last((follow) => (
            database.activity.add({
              id,
              type: 'Undo',
              object: {
                id: follow.id,
              },
              published,
            })
          ));
      }
    }

    return dispatch(action);
  }, [
    database,
    dispatch,
  ]);

  // If the database is not availble, persist in localStorage.
  useEffect(() => {
    if (state.status === STATUS_READY && !database && 'localStorage' in window) {
      window.localStorage.setItem(FOLLOWING, JSON.stringify(state.following));
    }
  }, [
    database,
    state.status,
    state.following,
  ]);

  // @TODO support more languages.
  const messages = {
    en,
  };

  return (
    <IntlProvider messages={messages} locale="en">
      <UpdaterContext.Provider value={autoUpdater}>
        <DatabaseContext.Provider value={database}>
          <AppContext.Provider value={[state, dispatcher]}>
            <PrompterContext.Provider value={prompter}>
              {/* eslint-disable-next-line react/jsx-props-no-spreading */}
              <Component {...pageProps} />
            </PrompterContext.Provider>
          </AppContext.Provider>
        </DatabaseContext.Provider>
      </UpdaterContext.Provider>
    </IntlProvider>
  );
}

export default Chickaree;
