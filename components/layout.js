import Head from 'next/head';
import Link from 'next/link';
import {
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useRouter } from 'next/router';
import useHomeEnabled from '../hooks/home-enabled';

const MENU_TOGGLE = 'MENU_TOGGLE';
const MENU_TRANSITION_COMPLETE = 'MENU_TRANSITION_COMPLETE';
const NAVIGATION = 'NAVIGATION';

const STATUS_OPEN = 'open';
const STATUS_CLOSED = 'closed';
const STATUS_OPENING = 'opening';
const STATUS_CLOSING = 'closing';

const initialState = {
  status: STATUS_CLOSED,
  scrollY: 0,
  navigate: '',
};

function reducer(state, action) {
  switch (action.type) {
    case MENU_TOGGLE:
      if ([STATUS_CLOSED, STATUS_CLOSING].includes(state.status)) {
        return {
          ...state,
          status: STATUS_OPENING,
          scrollY: action.payload,
          navigate: '',
        };
      }

      if ([STATUS_OPEN, STATUS_OPENING].includes(state.status)) {
        return {
          ...state,
          status: STATUS_CLOSING,
        };
      }

      return state;
    case NAVIGATION:
      if ([STATUS_OPEN, STATUS_OPENING].includes(state.status)) {
        return {
          ...state,
          status: STATUS_CLOSING,
          navigate: action.payload,
        };
      }

      return state;
    case MENU_TRANSITION_COMPLETE:
      if ([STATUS_OPENING, STATUS_CLOSING].includes(state.status)) {
        return {
          ...state,
          status: state.status === STATUS_OPENING ? STATUS_OPEN : STATUS_CLOSED,
          scrollY: state.status === STATUS_CLOSING ? 0 : state.scrollY,
        };
      }
      return state;
    default:
      throw new Error(`Unkown Action: ${action.type}`);
  }
}

function NavLink({
  href,
  disabled,
  onClick,
  children,
}) {
  const router = useRouter();
  const { pathname } = router;

  const className = useMemo(() => [
    'nav-link',
    pathname === href ? 'active' : '',
    disabled ? 'disabled' : '',
  ].filter((c) => !!c).join(' '), [
    pathname,
    href,
    disabled,
  ]);

  return (
    <a
      href={href}
      className={className}
      onClick={onClick}
      aria-disabled={disabled ? true : undefined}
    >
      {children}
    </a>
  );
}

const Layout = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const router = useRouter();
  const isHomeEnabled = useHomeEnabled();
  const canvasRef = useRef(undefined);

  // Update the state when the animation completes.
  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    canvasRef.current.addEventListener('transitionend', () => {
      dispatch({ type: MENU_TRANSITION_COMPLETE });
    });
  }, []);

  const handleClick = useCallback(() => {
    dispatch({
      type: MENU_TOGGLE,
      payload: window.scrollY,
    });
  });

  useEffect(() => {
    // Stop the scrolling and prevent further scrolling.
    if (state.status === STATUS_OPENING) {
      document.body.classList.add('overflow-hidden');
      // Hack to prevent scrolling.
      window.onscroll = () => {
        window.scrollTo(0, state.scrollY);
      };
      // Scroll to the position.
      window.scrollTo(0, state.scrollY);
    } else if (state.status === STATUS_CLOSING) {
      // Stop listening to the scroll event.
      window.onscroll = undefined;
      document.body.classList.remove('overflow-hidden');
    }
  }, [
    state.status,
    state.scrollY,
  ]);

  useEffect(() => {
    if (state.status !== STATUS_CLOSED || state.navigate === '') {
      return;
    }

    router.push(state.navigate);
  }, [
    router,
    state.status,
    state.navigate,
  ]);

  const canvasClassName = useMemo(() => (
    `canvas nav-${state.status}`
  ), [
    state.status,
  ]);

  const styles = useMemo(() => ({
    top: state.scrollY,
  }), [
    state.scrollY,
  ]);

  const menuButtonTitle = useMemo(() => {
    if ([STATUS_OPEN, STATUS_OPENING].includes(state.status)) {
      return 'Close menu';
    }

    return 'Open menu';
  }, [
    state.status,
  ]);

  const menuButtonClassName = useMemo(() => {
    if ([STATUS_OPEN, STATUS_OPENING].includes(state.status)) {
      return 'btn btn-link active';
    }

    return 'btn btn-link';
  }, [
    state.status,
  ]);

  const handleNavClick = useCallback((e) => {
    // Detect if user is attempting to open in a new window.
    if (e.shiftKey || e.ctrlKey || e.metaKey || e.button === 1) {
      return;
    }

    e.preventDefault();

    dispatch({ type: NAVIGATION, payload: e.currentTarget.getAttribute('href') });
  }, []);

  return (
    <>
      <Head>
        <title>Chickaree</title>
        <meta key="viewport" name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta key="og:title" property="og:title" content="Chickaree" />
        <meta key="og:url" property="og:url" content="https://chickar.ee" />
        <meta key="og:description" property="og:description" content="A new social network designed to reach all your followers without an algorithm getting in the way." />
        <meta key="og:type" property="og:type" content="website" />
        <meta key="og:image" property="og:image" content="https://chickar.ee/img/og-background.png" />
        <script key="schema" type="application/ld+json" />
      </Head>
      <div className="wrapper">
        <div className={canvasClassName} ref={canvasRef}>
          <nav className="main" style={styles}>
            <ol className="nav flex-column nav-lg">
              {/* @TODO Add icon attribution (about page?) */}
              {/* https://www.flaticon.com/free-icon/tree-silhouette_46564 */}
              <li className="nav-item home">
                <NavLink href="/" onClick={handleNavClick} disabled={!isHomeEnabled}>
                  <svg version="1.1" x="0px" y="0px" width="18" height="18" viewBox="0 0 590.074 590.073">
                    <g>
                      <path
                        d="M537.804,174.688c0-44.772-33.976-81.597-77.552-86.12c-12.23-32.981-43.882-56.534-81.128-56.534
                          c-16.304,0-31.499,4.59-44.514,12.422C319.808,17.949,291.513,0,258.991,0c-43.117,0-78.776,31.556-85.393,72.809
                          c-3.519-0.43-7.076-0.727-10.71-0.727c-47.822,0-86.598,38.767-86.598,86.598c0,2.343,0.172,4.638,0.354,6.933
                          c-24.25,15.348-40.392,42.333-40.392,73.153c0,27.244,12.604,51.513,32.273,67.387c-0.086,1.559-0.239,3.107-0.239,4.686
                          c0,47.822,38.767,86.598,86.598,86.598c14.334,0,27.817-3.538,39.723-9.696c16.495,11.848,40.115,26.67,51.551,23.715
                          c0,0,4.255,65.905,3.337,82.64c-1.75,31.843-11.303,67.291-18.025,95.979h104.117c0,0-15.348-63.954-16.018-85.307
                          c-0.669-21.354,6.675-60.675,6.675-60.675l36.118-37.36c13.903,9.505,30.695,14.908,48.807,14.908
                          c44.771,0,81.597-34.062,86.12-77.639c32.98-12.23,56.533-43.968,56.533-81.214c0-21.994-8.262-41.999-21.765-57.279
                          C535.71,195.926,537.804,185.561,537.804,174.688z M214.611,373.444c6.942-6.627,12.766-14.372,17.212-22.969l17.002,35.62
                          C248.816,386.096,239.569,390.179,214.611,373.444z M278.183,395.438c-8.798,1.597-23.782-25.494-34.416-47.517
                          c11.791,6.015,25.102,9.477,39.254,9.477c3.634,0,7.201-0.296,10.72-0.736C291.006,374.286,286.187,393.975,278.183,395.438z
                          M315.563,412.775c-20.35,5.651-8.167-36.501-2.334-60.904c4.218-1.568,8.301-3.413,12.183-5.604
                          c2.343,17.786,10.069,33.832,21.516,46.521C337.011,401.597,325.593,409.992,315.563,412.775z"
                      />
                    </g>
                  </svg>
                  <span> Home</span>
                </NavLink>
              </li>
              <li className="nav-item search">
                <NavLink href="/search" onClick={handleNavClick}>
                  <svg xmlns="http://www.w3.org/2000/svg" height="23" viewBox="0 0 24 24" width="23">
                    <path d="M0 0h24v24H0z" fill="none" />
                    <path
                      d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                    />
                  </svg>
                  <span> Search</span>
                </NavLink>
              </li>
            </ol>
          </nav>
          <header style={styles}>
            <div className="container-fluid">
              <div className="row pt-1 pb-1">
                <div className="col-8 offset-2 text-center">
                  <Link href="/">
                    <a>
                      <img src="/img/icon.svg" alt="chickar.ee" />
                    </a>
                  </Link>
                </div>
                <div className="col-2 text-right">
                  <button type="button" className={menuButtonClassName} title={menuButtonTitle} onClick={handleClick} aria-pressed={[STATUS_OPENING, STATUS_OPEN].includes(state.status) ? true : undefined}>
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
                      <path d="M0 0h24v24H0z" fill="none" />
                      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </header>
          {/* eslint-disable-next-line max-len */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions,jsx-a11y/click-events-have-key-events */}
          <main className="content pt-5" onClick={[STATUS_OPEN, STATUS_OPENING].includes(state.status) ? handleClick : undefined}>
            <div className="event-container">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default Layout;
