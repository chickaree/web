import { useEffect, useRef, useReducer } from 'react';
import { from, concat, of } from 'rxjs';
import { switchMap, flatMap, reduce } from 'rxjs/operators';
import useReactor from '@cinematix/reactor';
import ResourceLink from '../resource-link';
import fetchResource from '../../utils/fetch-resource';
import Icon from '../icon';
import Listing from '../listing';
import getResponseData from '../../utils/response/data';

function keepPosition(win, doc) {
  return (callback) => {
    const height = doc.body.clientHeight;
    callback();
    win.scrollTo(0, win.scrollY + doc.body.clientHeight - height);
  };
}

function Banner({ src, alt, load }) {
  const container = useRef(undefined);

  // Load the image first to prevent the user from being scrolled.
  useEffect(() => {
    if (!container.current || !load) {
      return;
    }

    const doc = container.current.ownerDocument;
    const win = doc.defaultView || doc.parentWindow;

    const keep = keepPosition(win, doc);

    // Remove any elements in the container without scrolling the user.
    while (container.current.firstChild) {
      keep(() => container.current.removeChild(container.current.firstChild));
    }

    if (!src) {
      return;
    }

    const image = doc.createElement('img');
    image.src = src;
    image.alt = alt;
    image.classList.add('w-100');
    image.onload = () => {
      // Add the image and prevent the user from being scrolled.
      // Give everything else a moment to load.
      keep(() => container.current.appendChild(image));
    };
  }, [
    load,
    src,
    alt,
  ]);

  return (
    <div ref={container} className={src ? 'banner' : ''} />
  );
}

function FeedIcon({ href, src, alt }) {
  if (!src) {
    return null;
  }

  return (
    <ResourceLink resource={href}>
      <a className="d-block">
        <Icon src={src} alt={alt} />
      </a>
    </ResourceLink>
  );
}

function FeedDescription({ description }) {
  if (!description) {
    return null;
  }

  return (
    <p>{description}</p>
  );
}

function FeedList({ feeds: feedList, hasIcon }) {
  if (!feedList || !feedList.length) {
    return null;
  }

  // Remove duplicate feeds.
  const feeds = [...feedList.reduce((map, feed) => {
    map.set(feed.url, feed);
    return map;
  }, new Map()).values()];

  const hasFeedIcons = !!feeds.filter((feed) => !!feed.icon).length;

  return (
    <div className="row mb-3">
      <div className={hasIcon ? 'col-lg-10 offset-lg-2 col' : 'col'}>
        <div className="card">
          <ol className="list-group list-group-flush">
            {feeds.map((feed) => (
              <li className="list-group-item" key={feed.url}>
                <div className="row">
                  <div className={hasFeedIcons ? 'col-3 col-md-2' : ''}>
                    <FeedIcon href={feed.url} src={feed.icon} alt={feed.title} />
                  </div>
                  <div className="col">
                    <h5>
                      <ResourceLink resource={feed.url}><a>{feed.title}</a></ResourceLink>
                    </h5>
                    <FeedDescription description={feed.description} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

const initialState = {
  feeds: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'FEEDS_SET':
      return {
        ...state,
        feeds: action.payload,
      };
    case 'RESET':
      return initialState;
    default:
      throw new Error('Invalid Action');
  }
}

// @TODO Refactor the FeedList to include this?
function feedReactor(value$) {
  return value$.pipe(
    switchMap(([feeds]) => (
      concat(
        of({ type: 'RESET' }),
        from(feeds).pipe(
          flatMap((href) => fetchResource(href), 2),
          flatMap((response) => getResponseData(response)),
          reduce((acc, item) => {
            if (!item) {
              return acc;
            }

            if (item.type !== 'feed') {
              return acc;
            }

            return {
              ...acc,
              payload: [
                ...acc.payload,
                item.resource,
              ],
            };
          }, { type: 'FEEDS_SET', payload: [] }),
        ),
      )
    )),
  );
}

function Website({
  resource: {
    sitename,
    description,
    banner,
    icon,
    feeds,
  },
}) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useReactor(feedReactor, dispatch, [feeds]);

  let className = [
    'container',
  ];

  if (banner) {
    className = [
      ...className,
      'has-banner',
    ];
  }

  return (
    <>
      <Banner src={banner} alt={sitename} load={feeds.length === 0 || state.feeds.length > 0} />
      <div className={className.join(' ')}>
        <Listing title={sitename} description={description} icon={icon} />
        <FeedList feeds={state.feeds} hasIcon={!!icon} />
      </div>
    </>
  );
}

export default Website;
