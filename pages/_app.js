import {
  useReducer,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import Dexie from 'dexie';
import { ulid } from 'ulid';
import { DateTime } from 'luxon';
import { Workbox } from 'workbox-window';
import AppContext from '../context/app';
import '../styles/styles.scss';

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
  const [state, dispatch] = useReducer(reducer, initialState);

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
      return;
    }

    const wb = new Workbox('/sw.js');
    const registration = wb.register();

    // Update the status based on the service worker registration.
    // Without this, the browser may issue a request before we are ready.
    // Code should wait until either 'ready' or 'sw-ready' before issuing
    // cross-origin requests.
    registration.then(() => {
      // @TODO Figure out why this isn't good enough! (at least for firefox)
      dispatch({
        type: 'SERVICEWORKER_READY',
      });
    });
  }, []);

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
    <AppContext.Provider value={[state, dispatcher]}>
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <Component {...pageProps} />
    </AppContext.Provider>
  );
}

export default Chickaree;
