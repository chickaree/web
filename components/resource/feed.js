import { useReducer } from 'react';
import { from, of, concat } from 'rxjs';
import {
  switchMap,
  flatMap,
  toArray,
  map,
} from 'rxjs/operators';
import useReactor from '@cinematix/reactor';
import Listing from '../listing';
import fetchResource from '../../utils/fetch-resource';
import getResponseData from '../../utils/response/data';
import Article from '../article';

const initialState = {
  items: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'ITEMS_SET':
      return {
        ...state,
        items: action.payload,
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
      concat(
        of({ type: 'RESET' }),
        from(items).pipe(
          flatMap((href, index) => (
            fetchResource(href).pipe(
              flatMap((response) => getResponseData(response)),
              flatMap((item) => of({
                item,
                index,
              })),
            )
          )),
          toArray(),
          map((feedItems) => ({
            type: 'ITEMS_SET',
            payload: [...feedItems.sort((a, b) => a.index - b.index).reduce((acc, { item }) => {
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
        ),
      )
    )),
  );
}

function Feed({
  resource: {
    url,
    title,
    description,
    icon,
    items,
  },
}) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useReactor(itemReactor, dispatch, [items]);

  const { origin } = new URL(url);

  return (
    <div className="container">
      <Listing title={title} description={description} icon={icon} />
      {state.items.map((item) => ((
        <Article
          key={item.url}
          origin={origin}
          title={item.title}
          url={item.url}
          description={item.description}
          icon={icon}
          banner={item.banner}
          sitename={title}
        />
      )))}
    </div>
  );
}

export default Feed;
