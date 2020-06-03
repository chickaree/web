import { useReducer, useMemo } from 'react';
import { from, of } from 'rxjs';
import {
  switchMap,
  flatMap,
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
import Article from '../article';
import getLinkHref from '../../utils/link-href';
import Card from '../card';

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

function FeedImage({ href, src, alt }) {
  if (!src) {
    return null;
  }

  return (
    <>
      <div className="embed-responsive embed-responsive-21by9 card-img-top">
        <ResourceLink resource={href}>
          <a>
            <img src={src} alt={alt} className="embed-responsive-item" loading="lazy" />
          </a>
        </ResourceLink>
      </div>
    </>
  );
}

function FeedIcon({ href, src, alt }) {
  if (!src) {
    return null;
  }

  return (
    <ResourceLink resource={href}>
      <a className="feed-icon d-block">
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
    <div className="card-text">{description}</div>
  );
}

function FeedList({ feeds, icon }) {
  if (!feeds || !feeds.length) {
    return null;
  }

  return feeds.map((feed) => {
    const imgSrc = getLinkHref(feed.image);

    const iconSrc = getLinkHref(feed.icon) || icon;

    let className = [];
    if (imgSrc) {
      className = [
        ...className,
        'has-image',
      ];
    }
    return (
      <Card key={feed.url}>
        <div className={className.join(' ')}>
          <FeedImage href={feed.url} src={imgSrc} alt={feed.name} />
          <div className="card-body">
            <div className="row">
              <div className={iconSrc ? 'col-3 col-md-2' : ''}>
                <FeedIcon href={feed.url} src={iconSrc} alt={feed.name} />
              </div>
              <div className="col">
                <h4 className="card-title">
                  <ResourceLink resource={feed.url}><a>{feed.name}</a></ResourceLink>
                </h4>
                <FeedDescription description={feed.summary} />
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  });
}

const initialState = {
  items: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'ITEMS_ADD':
      return {
        ...state,
        items: [...[
          ...state.items,
          ...action.payload,
        ].reduce((acc, item) => {
          acc.set(item.data.url, item);

          return acc;
        }, new Map()).values()].sort((a, b) => a.index - b.index).sort((a, b) => {
          const aDateTime = a.data.published
            ? DateTime.fromISO(a.data.published)
            : DateTime.fromMillis(0);
          const bDateTime = b.data.published
            ? DateTime.fromISO(b.data.published)
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

function itemReactor(value$) {
  return value$.pipe(
    switchMap(([items]) => (
      from(items).pipe(
        flatMap(({ href }, index) => (
          fetchResource(href).pipe(
            flatMap((response) => getResponseData(response)),
            flatMap((data) => of({
              data,
              index,
            })),
          )
        )),
        // Group by tick.
        bufferTime(0),
        filter((a) => a.length > 0),
        map((feedItems) => ({
          type: 'ITEMS_ADD',
          payload: [...feedItems.reduce((acc, item) => {
            if (!item.data) {
              return acc;
            }

            acc.set(item.data.url, item);

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
    name,
    attributedTo = {},
    summary,
    image,
    icon,
    orderedItems = [],
  },
}) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useReactor(itemReactor, dispatch, [orderedItems]);

  let className = [
    'container',
  ];

  if (image || attributedTo.image) {
    className = [
      ...className,
      'has-banner',
    ];
  }

  if (icon || attributedTo.icon) {
    className = [
      ...className,
      'has-icon',
    ];
  }

  const title = name || attributedTo.name;

  const iconSrc = getLinkHref(icon) || getLinkHref(attributedTo.icon);

  const { feeds, entities } = useMemo(() => (
    state.items.reduce((acc, { data }) => {
      if (data.type === 'OrderedCollection') {
        return {
          ...acc,
          feeds: [
            ...acc.feeds,
            data,
          ],
        };
      }

      return {
        ...acc,
        entities: [
          ...acc.entities,
          data,
        ],
      };
    }, {
      feeds: [],
      entities: [],
    })
  ), [state.items]);

  return (
    <>
      <Banner src={getLinkHref(image) || getLinkHref(attributedTo.image)} alt={title} />
      <div className={className.join(' ')}>
        <div className="row mt-3 mb-3 d-flex d-lg-none">
          <CollectionIcon src={iconSrc} alt={title} className="col-4" />
          <div className={iconSrc ? 'col' : 'col-lg-8 offset-lg-2 col'}>
            <div className="row">
              <div className="col-12 col-lg-auto">
                <h2>{title}</h2>
              </div>
              <Description description={summary} />
            </div>
          </div>
        </div>
        <div className="row mt-3 mb-3">
          <CollectionIcon src={iconSrc} alt={title} className="col-lg-2 d-lg-block d-none" />
          <div className={iconSrc ? 'col-lg-10 col' : 'col-lg-8 offset-lg-2 col'}>
            <div className="row d-none d-lg-flex">
              <div className="col-12 col-lg-auto">
                <h2>{title}</h2>
              </div>
              <Description description={summary} />
            </div>
            <div className="row">
              <div className="collection col">
                <FeedList feeds={feeds} icon={iconSrc} />
                {entities.map((item) => (
                  <Article
                    key={item.url}
                    source={url}
                    name={item.name}
                    published={item.published}
                    url={item.url}
                    summary={item.summary}
                    image={item.image}
                    attributedTo={{
                      ...item.attributedTo,
                      ...attributedTo,
                      icon: icon || attributedTo.icon || item.attributedTo.icon,
                      name: name || attributedTo.name || item.attributedTo.name,
                    }}
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
