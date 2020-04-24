import { useReducer } from 'react';
import { from, of } from 'rxjs';
import {
  switchMap,
  flatMap,
  toArray,
  map,
  bufferTime,
  filter,
} from 'rxjs/operators';
import { DateTime } from 'luxon';
import useReactor from '@cinematix/reactor';
import ResourceLink from '../resource-link';
import fetchResource from '../../utils/fetch-resource';
import Icon from '../icon';
import getResponseData from '../../utils/response/data';
import PageTitle from '../page-title';
import Article from '../article';

function Banner({ src, alt }) {
  if (!src) {
    return null;
  }

  return (
    <div className="embed-responsive embed-responsive-21by9">
      <img src={src} alt={alt} className="embed-responsive-item" loading="lazy" />
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

function CollectionIcon({ src, alt, className }) {
  if (!src) {
    return null;
  }

  return (
    <div className={className}>
      <div className="icon">
        <Icon src={src} alt={alt} />
      </div>
    </div>
  );
}


function Description({ description }) {
  if (!description) {
    return null;
  }

  return (
    <div className="col-12 col-lg feed-desc">
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

function FeedList({ feeds: feedList }) {
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
      <div className="col feed-item">
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
  items: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'FEEDS_SET':
      return {
        ...state,
        feeds: action.payload,
      };
    case 'ITEMS_ADD':
      return {
        ...state,
        items: [...[
          ...state.items,
          ...action.payload,
        ].reduce((acc, item) => {
          acc.set(item.url, item);

          return acc;
        }, new Map()).values()].sort((a, b) => {
          const aDateTime = a.datePublished
            ? DateTime.fromISO(a.datePublished)
            : DateTime.fromMillis(0);
          const bDateTime = b.datePublished
            ? DateTime.fromISO(b.datePublished)
            : DateTime.fromMillis(0);

          return bDateTime.diff(aDateTime);
        }),
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
      from(feeds).pipe(
        flatMap((href, index) => (
          fetchResource(href).pipe(
            flatMap((response) => getResponseData(response)),
            flatMap((item) => of({
              item,
              index,
            })),
          )
        )),
        // @TODO Render as they come in (group by tick), but sort by date in the reducer.
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
      )
    )),
  );
}

function itemReactor(value$) {
  return value$.pipe(
    switchMap(([items]) => (
      from(items).pipe(
        flatMap((href) => (
          fetchResource(href).pipe(
            flatMap((response) => getResponseData(response)),
          )
        )),
        // Group by tick.
        bufferTime(0),
        filter((a) => a.length > 0),
        map((feedItems) => ({
          type: 'ITEMS_ADD',
          payload: [...feedItems.reduce((acc, item) => {
            if (!item) {
              return acc;
            }

            if (item.type !== 'article') {
              return acc;
            }

            acc.set(item.resource.url, item.resource);

            return acc;
          }, new Map()).values()],
        })),
      )
    )),
  );
}

function Collection({
  resource: {
    url,
    title,
    sitename,
    description,
    banner,
    icon,
    feeds = [],
    items = [],
  },
}) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useReactor(feedReactor, dispatch, [feeds]);
  useReactor(itemReactor, dispatch, [items]);

  let className = [
    'container',
  ];

  if (banner) {
    className = [
      ...className,
      'has-banner',
    ];
  }

  if (icon) {
    className = [
      ...className,
      'has-icon',
    ];
  }

  return (
    <>
      <PageTitle parts={[sitename || title]} />
      <Banner src={banner} alt={sitename || title} />
      <div className={className.join(' ')}>
        <div className="row mt-3 mb-3 d-flex d-lg-none">
          <CollectionIcon src={icon} alt={sitename || title} className="col-4" />
          <div className={icon ? 'col' : 'col-lg-8 offset-lg-2 col'}>
            <div className="row">
              <div className="col-12 col-lg-auto">
                <h2>{sitename || title}</h2>
              </div>
              <Description description={description} />
            </div>
          </div>
        </div>
        <div className="row mt-3 mb-3">
          <CollectionIcon src={icon} alt={sitename || title} className="col-lg-2 d-lg-block d-none" />
          <div className={icon ? 'col-lg-10 col' : 'col-lg-8 offset-lg-2 col'}>
            <div className="row d-none d-lg-flex">
              <div className="col-12 col-lg-auto">
                <h2>{sitename || title}</h2>
              </div>
              <Description description={description} />
            </div>
            <div className="row">
              <div className="collection col">
                <FeedList feeds={state.feeds} />
                {state.items.map((item) => (
                  <Article
                    key={item.url}
                    source={url}
                    title={item.title}
                    datePublished={item.datePublished}
                    url={item.url}
                    description={item.description}
                    icon={icon}
                    banner={item.banner}
                    sitename={sitename || title}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Collection;
