import { useEffect, useRef, useReducer } from 'react';
import { switchMap, flatMap, reduce } from 'rxjs/operators';
import useReactor from '@cinematix/reactor';
import cherrio from 'cheerio';
import ResourceLink from '../resource-link';
import { from, concat, of } from 'rxjs';
import fetchResource from '../../utils/fetch-resource';
import getResponseUrl from '../../utils/response-url';
import getSafeAssetUrl from '../../utils/safe-asset-url';

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

function Icon({ src, alt }) {
  if (!src) {
    return null;
  }

  return (
    <div className="embed-responsive embed-responsive-1by1">
      <div className="embed-responsive-item border rounded p-1">
        <div className="row align-items-center h-100">
          <div className="col">
            <img src={src} alt={alt} className="w-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

function WebsiteIcon({ src, alt }) {
  if (!src) {
    return null;
  }

  return (
    <div className="col-4 col-lg-2">
      <div className="icon">
        <Icon src={src} alt={alt} />
      </div>
    </div>
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

function WebsiteDescription({ description }) {
  if (!description) {
    return null;
  }

  return (
    <div className="col-12 col-lg">
      <p>{description}</p>
    </div>
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
    map.set(feed.feed_url, feed);
    return map;
  }, new Map()).values()];

  const hasFeedIcons = !!feeds.filter((feed) => !!feed.icon).length;

  return (
    <div className="row mb-3">
      <div className={hasIcon ? 'col-lg-10 offset-lg-2 col' : 'col'}>
        <div className="card">
          <ol className="list-group list-group-flush">
            {feeds.map((feed) => (
              <li className="list-group-item" key={feed.feed_url}>
                <div className="row">
                  <div className={hasFeedIcons ? 'col-3 col-md-2' : ''}>
                    <FeedIcon href={feed.feed_url} src={feed.icon} alt={feed.title} />
                  </div>
                  <div className="col">
                    <h5>
                      <ResourceLink resource={feed.feed_url}><a>{feed.title}</a></ResourceLink>
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

async function getFeedDataFromJsonResponse(response) {
  const data = await response.json();
  const url = getResponseUrl(response);
  return {
    title: data.title || '',
    icon: getSafeAssetUrl(data.icon, url.toString()),
    feed_url: url.toString(),
    description: data.description || '',
  };
}

async function getFeedDataFromXmlResponse(response) {
  const url = getResponseUrl(response);
  const data = await response.text();
  const feed$ = cherrio.load(data, {
    xmlMode: true,
  });

  let root = feed$.root().children().first();
  if (root.is('rss')) {
    root = root.children().first();
  }

  if (root.is('channel')) {
    return {
      title: feed$('> title', root).last().text(),
      feed_url: url.toString(),
      icon: getSafeAssetUrl(feed$('> image > url', root).last().text(), url.toString()),
      description: feed$('> description', root).last().text(),
    };
  }

  if (root.is('feed')) {
    return {
      title: feed$('> title', root).last().text(),
      feed_url: url.toString(),
      icon: getSafeAssetUrl(feed$('> icon', root).last().text(), url.toString()),
      description: feed$('> description', root).last().text(),
    };
  }

  return null;
}

// @TODO Refactor the FeedList to include this?
function feedReactor(value$) {
  return value$.pipe(
    switchMap(([feeds]) => (
      concat(
        of({ type: 'RESET' }),
        from(feeds).pipe(
          flatMap(({ href }) => fetchResource(href), 2),
          flatMap((response) => {
            if (response.headers.has('Content-Type') && response.headers.get('Content-Type').includes('application/json')) {
              return getFeedDataFromJsonResponse(response);
            }

            return getFeedDataFromXmlResponse(response);
          }),
          reduce((acc, feed) => {
            if (!feed) {
              return acc;
            }

            console.log('FEED', feed);

            return {
              ...acc,
              payload: [
                ...acc.payload,
                feed,
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
        <div className="row mt-3">
          <WebsiteIcon src={icon} alt={sitename} />
          <div className="col">
            <div className="row">
              <div className="col-12 col-lg-auto">
                <h2>{sitename}</h2>
              </div>
              <WebsiteDescription description={description} />
            </div>
          </div>
        </div>
        <FeedList feeds={state.feeds} hasIcon={!!icon} />
      </div>
    </>
  );
}

export default Website;
