import Head from 'next/head';
import {
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useContext,
  useLayoutEffect,
} from 'react';
import { useRouter } from 'next/router';
import { BananaContext, Message } from '@wikimedia/react.i18n';
import BackButton from './back-button';
import UpdaterContext from '../context/updater';

const MENU_OPEN = 'MENU_OPEN';
const MENU_CLOSE = 'MENU_CLOSE';

const STATUS_OPEN = 'open';
const STATUS_CLOSED = 'closed';

const initialState = {
  status: STATUS_CLOSED,
  scrollY: 0,
  navigate: '',
};

function reducer(state, action) {
  switch (action.type) {
    case MENU_OPEN:
      if (state.status === STATUS_CLOSED) {
        return {
          ...state,
          status: STATUS_OPEN,
          scrollY: action.payload,
        };
      }

      return state;
    case MENU_CLOSE:
      if (state.status === STATUS_OPEN) {
        return {
          ...state,
          status: STATUS_CLOSED,
          scrollY: action.payload,
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
  visable,
  onClick,
  children,
}) {
  const router = useRouter();
  const { pathname } = router;
  const prefetchedRef = useRef(false);

  useEffect(() => {
    // Wait until the link is visiable.
    if (!visable) {
      return;
    }

    // Only prefetch once.
    if (prefetchedRef.current) {
      return;
    }

    router.prefetch(href);
    prefetchedRef.current = true;
  }, [
    router,
    visable,
    href,
  ]);

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

function getCanvasClassName(status) {
  return `canvas nav-${status}`;
}

function Layout({
  backButton = false,
  onRefresh,
  children,
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const router = useRouter();
  const canvasRef = useRef();
  const headerRef = useRef();
  const navRef = useRef();
  const statusRef = useRef(state.status);
  const autoUpdater = useContext(UpdaterContext);
  const banana = useContext(BananaContext);

  const handleMenuClick = useCallback(() => {
    dispatch({
      type: state.status === STATUS_OPEN ? MENU_CLOSE : MENU_OPEN,
      payload: window.scrollY,
    });
  }, [
    state.status,
  ]);


  useLayoutEffect(() => {
    // The status has not changed.
    if (state.status === statusRef.current) {
      return;
    }

    statusRef.current = state.status;

    // Stop the scrolling and prevent further scrolling.
    if (state.status === STATUS_OPEN) {
      document.body.classList.add('overflow-hidden');
      // Hack to prevent scrolling.
      window.onscroll = () => {
        window.scrollTo(0, state.scrollY);
      };
      // Scroll to the position.
      window.scrollTo(0, state.scrollY);

      headerRef.current.style.top = `${state.scrollY}px`;
      headerRef.current.style.position = 'absolute';
      navRef.current.style.top = `${state.scrollY}px`;
    } else if (state.status === STATUS_CLOSED) {
      // Stop listening to the scroll event.
      window.onscroll = undefined;
      document.body.classList.remove('overflow-hidden');

      // Wait until the transition has ended to update the head styles.
      canvasRef.current.addEventListener('transitionend', (event) => {
        // It's really weird that we have to wwait even more...
        setTimeout(() => {
          if (navRef.current) {
            navRef.current.style.top = 0;
          }
          if (headerRef.current) {
            headerRef.current.style.top = 0;
            headerRef.current.style.position = 'fixed';
          }
        }, event.elapsedTime * 1000);
      }, { once: true });
    }
  }, [
    state.status,
    state.scrollY,
  ]);

  const canvasClassName = getCanvasClassName(state.status);

  const menuButtonTitle = useMemo(() => {
    if (state.status === STATUS_OPEN) {
      return banana.i18n('menu-close');
    }

    return banana.i18n('menu-open');
  }, [
    banana,
    state.status,
  ]);

  const menuButtonClassName = useMemo(() => {
    if (state.status === STATUS_OPEN) {
      return 'btn btn-link pl-0 pr-0 active';
    }

    return 'btn btn-link pl-0 pr-0';
  }, [
    state.status,
  ]);

  const handleNavClick = useCallback((e) => {
    // Detect if user is attempting to open in a new window.
    if (e.shiftKey || e.ctrlKey || e.metaKey || e.button === 1) {
      return;
    }

    e.preventDefault();

    if (state.status === STATUS_OPEN) {
      const href = e.currentTarget.getAttribute('href');
      // Wait until the transition ends before navigating.
      canvasRef.current.addEventListener('transitionend', (event) => {
        // It's really weird that we have to wwait even more...
        setTimeout(() => {
          router.push(href);
        }, event.elapsedTime * 1000);
      }, { once: true });

      dispatch({ type: MENU_CLOSE });
    } else {
      router.push(e.currentTarget.getAttribute('href'));
    }
  }, [
    state.status,
  ]);

  const onLogoClick = useCallback(() => {
    // Before doing anything, scroll to the top of the page to make the site
    // feel like it's doing something.
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });

    // If the app needs to be updated, do that instead.
    if (autoUpdater()) {
      return;
    }

    // If there is no refresh callback, reload the page instead to force a refresh.
    if (!onRefresh) {
      router.reload();
      return;
    }

    onRefresh();
  }, [
    router,
    onRefresh,
    autoUpdater,
  ]);

  const logo = useMemo(() => {
    const img = (
      <img src="/img/icon2.svg" alt={banana.i18n('name')} />
    );

    if (state.status === STATUS_CLOSED && router.pathname === '/') {
      return (
        <button type="button" className="btn btn-link p-0" title={banana.i18n('refresh')} onClick={onLogoClick}>
          {img}
        </button>
      );
    }

    return (
      <a href="/" onClick={handleNavClick} title={banana.i18n('menu-home')}>
        {img}
      </a>
    );
  }, [
    state.status,
    router.pathname,
    handleNavClick,
    onLogoClick,
  ]);

  const isVisable = state.stuats !== STATUS_CLOSED;

  return (
    <>
      <Head>
        <title>{banana.i18n('name')}</title>
        <link rel="manifest" href="/manifest.json" />
        <meta key="robots" name="robots" content="all" />
        <meta key="viewport" name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta key="og:title" property="og:title" content={banana.i18n('name')} />
        <meta key="og:url" property="og:url" content="https://chickar.ee" />
        <meta key="og:description" property="og:description" content={banana.i18n('desc')} />
        <meta key="og:type" property="og:type" content="website" />
        <meta key="og:image" property="og:image" content="https://chickar.ee/img/og-background2.png" />
        <script key="schema" type="application/ld+json" />
      </Head>
      <div className="wrapper">
        <div className={canvasClassName} ref={canvasRef}>
          <nav className="main" ref={navRef}>
            <ol className="nav flex-column nav-lg">
              <li className="nav-item home">
                <NavLink href="/" onClick={handleNavClick} visable={isVisable}>
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    x="0px"
                    y="0px"
                    width="21"
                    height="21"
                    viewBox="0 0 568.031 568.03"
                  >
                    <g>
                      <path
                        d="M508.752,177.104c-12.55-9.086-21.587-23.337-20.004-37.312c5.586-49.327-24.644-91.457-73.514-99.144 c-8.678-1.367-17.319-5.092-25.141-9.282c-14.745-7.902-30.11-10.812-45.998-6.381c-8.58,2.395-13.859,1.326-20.678-4.847 c-38.899-35.219-99.862-22.632-118.92,25.169c-5.471,13.729-13.562,21.742-26.247,26.965c-2.832,1.167-5.94,2.484-7.952,4.639 c-6.332,6.781-12.366,5.108-20.037,1.845C100.74,57.663,47.41,92.371,45.346,146.044c-0.293,7.666-3.472,15.989-7.584,22.599 c-14.721,23.685-17.324,47.446-7.442,72.065c-7.116,17.776-0.91,39.939,16.618,52.796c19.233,14.112,41.412,6.748,58.409-6.912 c4.811-0.457,9.707-1.432,14.705-2.962c9.992-3.064,19.013-6.724,27.438-2.644c1.334,0.991,2.705,1.872,4.096,2.685 c0.372,0.31,0.743,0.6,1.114,0.946c0.049-0.077,0.09-0.139,0.139-0.216c2.774,1.497,5.651,2.631,8.597,3.496 c16.345,57.765,51.481,108.36,99.731,144.22c-2.941,35.333-12.346,69.973-29.87,103.918c-19.56,11.958-43.423,3.309-63.905-2.362 c-18.107-5.015-35.737-6.862-53.815-1.094c-3.741,1.195-5.483,4.153-5.667,7.218c-0.024,0.086-0.061,0.155-0.082,0.244 c-1.371,5.892-2.742,11.783-4.113,17.671c-1.281,5.512,2.689,9.286,6.993,10.028c0.673,0.172,1.387,0.29,2.179,0.29h334.561 c2.934,0,5.019-1.289,6.315-3.117c1.926-1.506,3.203-3.814,3.203-6.405v-12.24c0-3.623-2.48-6.724-5.802-7.76 c-1.269-1.069-2.945-1.759-5.08-1.759h-101.09c-5.022-5.802-10.135-11.661-15.414-17.458 c-14.688-16.129-21.167-34.081-14.565-55.799c2.293-7.544,3.945-15.39,4.899-23.219c2.819-23.199,5.455-46.508,8.128-70.156 c33.929-3.231,64.61-17.698,88.43-42.244c9.882-0.024,18.752-2.954,26.148-7.928l2.967-0.922 c16.12,13.008,40.987,14.35,59.771,7.414c17.405-6.427,32.457-23.836,32.983-42.975c0.049-1.792-0.041-3.566-0.196-5.325 C551.695,243.241,539.304,199.227,508.752,177.104z M213.658,282.23c0.192-0.073,0.351-0.131,0.542-0.204 c3.505-1.334,9.613,0.196,12.767,2.647c4.447,3.46,8.653,7.23,12.766,11.065c0.082,0.326,0.086,0.628,0.188,0.963 c6.279,20.983,12.559,41.971,18.837,62.954c1.498,10.576,2.452,21.082,2.97,31.534C229.24,364.475,211.467,324.81,213.658,282.23z M335.541,342.88c1.469-3.518,2.941-7.034,4.472-10.535c0.51,0,1.024,0,1.534-0.004c0-1.212,0.028-2.428,0.069-3.647 c4.19-9.396,8.768-18.584,13.908-27.364c6.549,5.773,13.37,10.959,20.637,15.189C363.995,327.273,350.355,336.103,335.541,342.88z"
                      />
                    </g>
                  </svg>
                  <span> <Message id="menu-home" /></span>
                </NavLink>
              </li>
              <li className="nav-item search">
                <NavLink href="/search" onClick={handleNavClick} visable={isVisable}>
                  <svg xmlns="http://www.w3.org/2000/svg" height="23" viewBox="0 0 24 24" width="23">
                    <path d="M0 0h24v24H0z" fill="none" />
                    <path
                      d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                    />
                  </svg>
                  <span> <Message id="menu-search" /></span>
                </NavLink>
              </li>
            </ol>
          </nav>
          <header ref={headerRef}>
            <div className="container-fluid">
              <div className="row pt-1 pb-1">
                <div className="col-2">
                  <BackButton disabled={!backButton} />
                </div>
                <div className="col-8 text-center">
                  {logo}
                </div>
                <div className="col-2 text-right">
                  <button type="button" className={menuButtonClassName} title={menuButtonTitle} onClick={handleMenuClick} aria-pressed={state.status === STATUS_OPEN ? true : undefined}>
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
          <main className="content min-vh-100" onClick={state.status === STATUS_OPEN ? handleMenuClick : undefined}>
            <div className="event-container min-vh-100">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export default Layout;
