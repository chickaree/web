import { Message } from '@wikimedia/react.i18n';
import {
  useCallback, useContext, useEffect, useReducer,
} from 'react';
import PrompterContext from '../context/prompter';
import Card from './card';

const ACTION_READY = 'READY';
const ACTION_ACCEPT = 'ACCEPT';
const ACTION_DECLINE = 'DECLINE';
const ACTION_PROMPT = 'PROMPT';

const STATUS_INIT = 'init';
const STATUS_READY = 'ready';
const STATUS_ACCEPT = 'accept';
const STATUS_DECLINE = 'decline';
const STATUS_PROMPT = 'prompt';

const initialState = {
  status: STATUS_INIT,
};

function reducer(state, action) {
  switch (action.type) {
    case ACTION_READY:
      if (state.status === STATUS_INIT) {
        return {
          ...state,
          status: STATUS_READY,
        };
      }

      return state;
    case ACTION_PROMPT:
      if ([STATUS_INIT, STATUS_READY].includes(state.status)) {
        return {
          ...state,
          status: STATUS_PROMPT,
        };
      }

      return state;
    case ACTION_ACCEPT:
      if (state.status !== STATUS_ACCEPT) {
        return {
          ...state,
          status: STATUS_ACCEPT,
        };
      }

      return state;
    case ACTION_DECLINE:
      if (state.status !== STATUS_DECLINE) {
        return {
          ...state,
          status: STATUS_DECLINE,
        };
      }

      return state;
    default:
      throw new Error('Invalid Action');
  }
}

function InstallPrompt() {
  const prompter = useContext(PrompterContext);
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const install = localStorage.getItem('install');

    switch (install) {
      case STATUS_ACCEPT:
        dispatch({ type: ACTION_ACCEPT });
        break;
      case STATUS_DECLINE:
        dispatch({ type: ACTION_DECLINE });
        break;
      default:
        dispatch({ type: ACTION_READY });
        break;
    }
  }, []);

  useEffect(() => {
    if (!prompter) {
      return;
    }

    dispatch({ type: ACTION_PROMPT });
  }, [
    prompter,
  ]);

  useEffect(() => {
    if (prompter && state.status === STATUS_ACCEPT) {
      prompter.prompt();
    }

    if ([STATUS_ACCEPT, STATUS_DECLINE].includes(state.status)) {
      localStorage.setItem('install', state.status);
    }
  }, [
    prompter,
    state.status,
  ]);

  const handleChange = useCallback((e) => {
    switch (e.target.value) {
      case STATUS_ACCEPT:
        dispatch({ type: ACTION_ACCEPT });
        break;
      case STATUS_DECLINE:
        dispatch({ type: ACTION_DECLINE });
        break;
      default:
        break;
    }
  }, [
    dispatch,
  ]);

  if (state.status !== STATUS_PROMPT) {
    return null;
  }

  return (
    <Card>
      <div className="card-body">
        <div className="row justify-content-between align-items-center">
          <div className="col-md-auto col-12 mb-3 mb-md-0">
            <Message
              id="install-prompt"
              placeholders={[
                <Message id="name" />,
              ]}
            />
          </div>
          <div className="col-md-auto col-12">
            <div className="row flex-nowrap">
              <div className="col">
                <button
                  className="btn btn-block btn-outline-secondary"
                  type="button"
                  name="status"
                  value="decline"
                  onClick={handleChange}
                >
                  <Message id="install-decline" />
                </button>
              </div>
              <div className="col">
                <button
                  className="btn btn-block btn-outline-primary"
                  type="button"
                  name="status"
                  value="accept"
                  onClick={handleChange}
                >
                  <Message id="install-accept" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default InstallPrompt;
