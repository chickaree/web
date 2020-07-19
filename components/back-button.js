import { useEffect, useReducer, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';

const HISTORY_LENGTH = 'HISTORY_LENGTH';

const initialState = {
  historyLength: 0,
};

function reducer(state, action) {
  switch (action.type) {
    case HISTORY_LENGTH:
      return {
        ...state,
        historyLength: action.payload,
      };
    default:
      throw new Error(`Unkown Action: ${action.type}`);
  }
}

function BackButton({
  disabled = false,
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const router = useRouter();

  useEffect(() => {
    dispatch({ type: HISTORY_LENGTH, payload: window.history.length });
  }, []);

  const hasBack = useMemo(() => {
    if (disabled) {
      return false;
    }

    if (state.historyLength < 2) {
      return false;
    }

    return true;
  }, [
    disabled,
    state.historyLength,
  ]);

  const handleClick = useCallback(() => {
    router.back();
  }, [
    router,
  ]);

  if (!hasBack) {
    return null;
  }

  return (
    <button type="button" title="Back" className="btn btn-link pl-0 pr-0" onClick={handleClick}>
      <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
        <path d="M0 0h24v24H0z" fill="none" />
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
      </svg>
    </button>
  );
}

export default BackButton;
