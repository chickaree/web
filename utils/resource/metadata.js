import getResourceLinkData from './link-data';

const URL_BASE = 'https://chickar.ee';

function createTitle(pieces = []) {
  let parts = pieces;

  if (!Array.isArray(parts)) {
    parts = [parts];
  }

  return [
    ...parts,
    'Chickaree',
  ].filter((part) => !!part).join(' | ');
}

function getResourceMetadata(resource) {
  const og = {};
  const schema = {
    '@context': 'http://schema.org/',
  };
  let title;

  if (!resource || !resource.url || !resource.url.href) {
    return {
      og,
      schema,
      title,
    };
  }

  const url = new URL(getResourceLinkData(resource.url.href).as, URL_BASE);
  schema.url = url.toString();
  og.url = url.toString();

  if (resource.name) {
    schema.name = resource.name;
    og.title = resource.name;
  }

  if (resource.summary) {
    schema.description = resource.summary;
    og.description = resource.summary;
  }

  if (resource.image && resource.image.href) {
    schema.image = resource.image.href;
    schema.primaryImageOfPage = resource.image.href;
    og.image = resource.image.href;
  }

  if (resource.published) {
    schema.datePublished = resource.published;
  }

  if (resource.type) {
    switch (resource.type) {
      case 'OrderedCollection':
        schema['@type'] = 'ProfilePage';
        if (resource.attributedTo) {
          schema.about = {
            '@type': 'Brand',
            name: resource.attributedTo.name,
            description: resource.attributedTo.summary,
            logo: resource.attributedTo.icon && resource.attributedTo.icon.href
              ? resource.attributedTo.icon.href
              : undefined,
          };
        }
        schema.mainEntity = {
          '@id': url.toString(),
          '@type': 'ItemList',
          sameAs: resource.url.href,
          datePublished: schema.datePublished,
          itemListElement: (resource.orderedItems || []).map(({ url: itemurl }) => {
            const itemURL = new URL(getResourceLinkData(itemurl.href).as, URL_BASE);

            return {
              '@id': itemURL.toString(),
              '@type': 'Thing',
              url: itemURL.toString(),
              sameAs: itemurl.href,
            };
          }),
        };
        og.type = 'profile';
        if (resource.name) {
          title = createTitle(resource.name);
        } else if (resource.attributedTo && resource.attributedTo.name) {
          title = createTitle(resource.attributedTo.name);
        }
        break;
      case 'Article':
        schema['@type'] = 'ItemPage';
        schema.mainEntity = {
          '@id': url.toString(),
          '@type': 'SocialMediaPosting',
          url: url.toString(),
          datePublished: schema.datePublished,
          sharedContent: {
            '@type': 'Article',
            title: schema.title,
            description: schema.description,
            image: schema.image,
            url: resource.url.href,
            datePublished: schema.datePublished,
          },
        };

        if (resource.attributedTo) {
          const { origin } = new URL(resource.url.href);
          const originURL = new URL(getResourceLinkData(origin).as, URL_BASE);

          schema.mainEntity.author = {
            '@id': originURL.toString(),
            '@type': 'Organization',
            name: resource.attributedTo.name,
            description: resource.attributedTo.summary,
            url: originURL.toString(),
            sameAs: origin,
            brand: {
              '@type': 'Brand',
              logo: resource.attributedTo.icon && resource.attributedTo.icon.href
                ? resource.attributedTo.icon.href
                : undefined,
            },
          };
        }

        og.type = 'article';
        title = createTitle([resource.name, resource.attributedTo.name]);
        break;
      default:
        og.type = 'website';
        title = createTitle();
        break;
    }
  }

  return {
    title,
    og,
    schema,
  };
}

export default getResourceMetadata;
