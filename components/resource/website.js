import { useEffect, useRef, useReducer } from 'react';
import { from, concat, of } from 'rxjs';
import {
  switchMap,
  flatMap,
  toArray,
  map,
} from 'rxjs/operators';
import useReactor from '@cinematix/reactor';
import ResourceLink from '../resource-link';
import fetchResource from '../../utils/fetch-resource';
import Icon from '../icon';
import Listing from '../listing';
import getResponseData from '../../utils/response/data';

function Banner({ src, alt }) {
  if (!src) {
    return null;
  }

  return (
    <div className="embed-responsive embed-responsive-21by9">
      <img src={src} alt={alt} className="embed-responsive-item" />
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
  const feeds = [...feedList.reduce((feedMap, feed) => {
    feedMap.set(feed.url, feed);
    return feedMap;
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
          flatMap((href, index) => (
            fetchResource(href).pipe(
              flatMap((response) => getResponseData(response)),
              flatMap((item) => of({
                item,
                index,
              })),
            )
          ), 2),
          toArray(),
          map((items) => (
            items.sort((a, b) => a.index - b.index).reduce((acc, { item }) => {
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
            }, { type: 'FEEDS_SET', payload: [] })
          )),
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
      <Banner src={banner} alt={sitename} />
      <div className={className.join(' ')}>
        <Listing title={sitename} description={description} icon={icon} />
        <FeedList feeds={state.feeds} hasIcon={!!icon} />
      </div>
    </>
  );
}

export default Website;
