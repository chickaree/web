import { useReducer } from 'react';
import { map } from 'rxjs/operators';
import useReactor from '@cinematix/reactor';
import AppContext from '../context/app';
import ActivityContext from '../context/activity';
import '../styles/styles.scss';

const initialState = {
  following: [],
};

function reducer(state, action) {
  switch (action.type) {
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
    default:
      throw new Error('Unkown Action');
  }
}

function Chickaree({ Component, pageProps }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const subject = useReactor((value$) => (
    value$.pipe(
      map((activity) => {
        if (activity.type === 'Undo') {
          return {
            type: 'UNFOLLOW',
            payload: activity.object.object.href,
          };
        }

        return {
          type: 'FOLLOW',
          payload: activity.object.href,
        };
      }),
    )
  ), dispatch);

  return (
    <ActivityContext.Provider value={subject}>
      <AppContext.Provider value={[state, dispatch]}>
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <Component {...pageProps} />
      </AppContext.Provider>
    </ActivityContext.Provider>
  );
}

export default Chickaree;
