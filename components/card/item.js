/* eslint-disable react/jsx-props-no-spreading */
import Feed from './feed';
import Article from './article';

function Item({
  resource,
}) {
  if (!resource) {
    return null;
  }

  switch (resource.type) {
    case 'OrderedCollection':
      return (
        <Feed {...resource} />
      );
    case 'Object':
    case 'Article': {
      return (
        <Article {...resource} />
      );
    }
    default:
      return null;
  }
}

export default Item;
