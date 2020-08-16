import {
  useReducer,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import Dexie from 'dexie';
import { ulid } from 'ulid';
import { DateTime } from 'luxon';
import { Workbox, messageSW } from 'workbox-window';
import { useRouter } from 'next/router';
import AppContext from '../context/app';
import '../styles/styles.scss';
import UpdaterContext from '../context/updater';

const initialState = {
  status: 'init',
  following: [],
};

async function loadFollowing(db) {
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
}

function reducer(state, action) {
  switch (action.type) {
    case 'DB_READY':
      return {
        ...state,
        status: state.status === 'sw-ready' ? 'ready' : 'db-ready',
        following: [...new Set([...state.following, ...action.payload])],
      };
    case 'FOLLOW':
      return {
        ...state,
        following: [...new Set([...state.following, action.payload])],
      };
    case 'UNFOLLOW':
      return {
        ...state,
        following: state.following.filter((href) => href !== action.payload),
      };
    case 'SERVICEWORKER_READY':
      return {
        ...state,
        status: state.status === 'db-ready' ? 'ready' : 'sw-ready',
      };
    default:
      throw new Error('Unkown Action');
  }
}

function Chickaree({ Component, pageProps }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const waitingSwRef = useRef();

  const dbRef = useRef();

  useEffect(() => {
    const db = new Dexie('Chickaree');
    db.version(1).stores({
      activity: '++id, type, published, object.id, object.type, object.href',
    });
    dbRef.current = db;

    loadFollowing(db).then((feeds) => {
      dispatch({
        type: 'DB_READY',
        payload: feeds,
      });
    });

    // No service worker in dev, fake it.
    if (process.env.DEV) {
      dispatch({
        type: 'SERVICEWORKER_READY',
      });
    } else {
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

      // Update the status based on the service worker registration.
      // Without this, the browser may issue a request before we are ready.
      // Code should wait until either 'ready' or 'sw-ready' before issuing
      // cross-origin requests.
      wb.controlling.then(() => {
        dispatch({
          type: 'SERVICEWORKER_READY',
        });
      });
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

  useEffect(() => {
    router.events.on('routeChangeComplete', autoUpdater);

    return () => {
      router.events.off('routeChangeComplete', autoUpdater);
    };
  }, [
    router,
    autoUpdater,
  ]);

  // Intercept a dispatch and convert it to an action to be saved in IndexedDB.
  const dispatcher = useCallback((action) => {
    if (!dbRef.current) {
      throw new Error('Database not ready!');
    }

    const db = dbRef.current;

    if (['FOLLOW', 'UNFOLLOW'].includes(action.type)) {
      const id = `https://chickar.ee/activity/${ulid().toLowerCase()}`;
      const published = DateTime.utc().toISO();

      if (action.type === 'FOLLOW') {
        db.activity.add({
          id,
          type: 'Follow',
          object: {
            type: 'Link',
            href: action.payload,
          },
          published,
        });
      } else if (action.type === 'UNFOLLOW') {
        db.activity
          .where('object.href').equals(action.payload)
          .last((follow) => (
            db.activity.add({
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
    dbRef,
    dispatch,
  ]);

  return (
    <UpdaterContext.Provider value={autoUpdater}>
      <AppContext.Provider value={[state, dispatcher]}>
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <Component {...pageProps} />
      </AppContext.Provider>
    </UpdaterContext.Provider>
  );
}

export default Chickaree;
