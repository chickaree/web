import {
  useReducer,
  useMemo,
  useContext,
  useCallback,
} from 'react';
import { from, concat, of } from 'rxjs';
import {
  switchMap,
  flatMap,
  map,
  bufferTime,
  filter,
} from 'rxjs/operators';
import { DateTime } from 'luxon';
import useReactor from '@cinematix/reactor';
import fetchResource from '../../utils/fetch/resource';
import Icon from '../icon';
import getResponseData from '../../utils/response/data';
import MIME_TYPES from '../../utils/mime-types';
import getLinkHref from '../../utils/link-href';
import AppContext from '../../context/app';
import Item from '../card/item';

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

function FollowButton({ href }) {
  const [state, dispatch] = useContext(AppContext);

  const following = useMemo(() => (
    !!state.following.find((h) => h === href)
  ), [
    href,
    state.following,
  ]);

  const onClick = useCallback(() => (
    dispatch({
      type: following ? 'UNFOLLOW' : 'FOLLOW',
      payload: href,
    })
  ), [
    following,
    href,
    dispatch,
  ]);

  const className = following ? 'btn-primary' : 'btn-outline-primary';

  return (
    <button type="button" className={`btn btn-block ${className}`} onClick={onClick}>{following ? 'Unfollow' : 'Follow'}</button>
  );
}

function CollectionIcon({
  src, alt, href, className, follow,
}) {
  if (!src) {
    return null;
  }

  return (
    <div className={className}>
      <div className="icon mb-3">
        <Icon src={src} alt={alt} />
      </div>
      {follow ? <FollowButton href={href} /> : null}
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
          acc.set(item.data.url.href, item);

          return acc;
        }, new Map()).values()].sort((a, b) => a.index - b.index).sort((a, b) => {
          const aPublished = a.data.published || a.data.updated;
          const aDateTime = aPublished
            ? DateTime.fromISO(aPublished)
            : DateTime.fromMillis(0);
          const bPublished = b.data.published || b.data.updated;
          const bDateTime = bPublished
            ? DateTime.fromISO(bPublished)
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
    switchMap(([{ orderedItems, ...resource }]) => (
      concat(
        of({
          type: 'RESET',
        }),
        from(orderedItems || []).pipe(
          flatMap((item, index) => (
            fetchResource(item.url.href).pipe(
              filter((response) => !!response.ok),
              flatMap((response) => getResponseData(response)),
              map((data) => ({
                data: {
                  ...item,
                  ...data,
                  context: resource,
                },
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

              acc.set(item.data.url.href, item);

              return acc;
            }, new Map()).values()],
          })),
        ),
      )
    )),
  );
}

function Collection({
  resource,
}) {
  const {
    url = {},
    name,
    attributedTo = {},
    summary,
    image,
    icon,
  } = resource;

  const [state, dispatch] = useReducer(reducer, initialState);

  useReactor(itemReactor, dispatch, [resource]);

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
        // Exclude feeds that are not a mediaType that we can handle.
        if (!MIME_TYPES.has(data.url.mediaType)) {
          return acc;
        }

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

  let follow;
  if (!iconSrc && entities.length > 0) {
    follow = (
      <div className="row mb-2 justify-content-center">
        <div className="col-8 col-lg-6">
          <FollowButton href={url.href} />
        </div>
      </div>
    );
  }

  return (
    <>
      <Banner src={getLinkHref(image) || getLinkHref(attributedTo.image)} alt={title} />
      <div className={className.join(' ')}>
        <div className="row mt-3 mb-3 d-flex d-lg-none">
          <CollectionIcon src={iconSrc} href={url.href} alt={title} className="col-4" />
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
          <CollectionIcon src={iconSrc} href={url.href} alt={title} className="col-lg-2 d-lg-block d-none" follow={entities.length > 0} />
          <div className={iconSrc ? 'col-lg-10 col' : 'col-lg-8 offset-lg-2 col'}>
            <div className="row d-none d-lg-flex">
              <div className="col-12 col-lg-auto">
                <h2>{title}</h2>
              </div>
              <Description description={summary} />
            </div>
            {follow}
            <div className="row">
              <div className="collection col">
                {feeds.map((feed) => (
                  <Item key={feed.id} resource={feed} />
                ))}
                {entities.map((item) => (
                  <Item key={item.id} resource={item} />
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
