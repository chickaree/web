import Head from 'next/head';
import getResourceLinkData from '../utils/resource-link-data';

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

function Meta({
  resource,
}) {
  if (!resource || !resource.url) {
    return null
  }

  const schema = {
    '@context': 'http://schema.org/',
  };

  const url = new URL(getResourceLinkData(resource.url).as, URL_BASE);
  schema.url = url.toString();
  const ogUrl = (
    <meta key="og:url" property="og:url" content={url.toString()} />
  );

  let ogTitle;
  if (resource.name) {
    schema.name = resource.name;
    ogTitle = (
      <meta key="og:title" property="og:title" content={resource.name} />
    );
  }

  let ogDescription;
  if (resource.summary) {
    schema.description = resource.summary;
    ogDescription = (
      <meta key="og:description" property="og:description" content={resource.summary} />
    );
  }

  let ogImage;
  if (resource.image && resource.image.href) {
    schema.image = resource.image.href;
    // @TODO check on other type!
    schema.primaryImageOfPage = resource.image.href;
    ogImage = (
      <meta key="og:image" property="og:image" content={resource.image.href} />
    );
  }

  if (resource.published) {
   schema.datePublished = resource.published;       
  }

  let titleTag;
  let ogType;
  if (resource.type) {
    let type;
    let title;
    switch (resource.type) {
      case 'OrderedCollection':
        schema['@type'] = 'ProfilePage';
        if (resource.attributedTo) {
          schema.about = {
            '@type': 'Brand',
            name: resource.attributedTo.name,
            description: resource.attributedTo.summary,
            logo: resource.attributedTo.icon && resource.attributedTo.icon.href ? resource.attributedTo.icon.href : undefined,
          };
        }
        schema.mainEntity = {
          '@id': url.toString(),
          '@type': 'ItemList',
          sameAs: resource.url,
          itemListElement: resource.orderedItems.map(({ href }) => {
            const itemURL = new URL(getResourceLinkData(href).as, URL_BASE);

            return {
              '@id': itemURL.toString(),
              '@type': 'Thing',
              url: itemURL.toString(),
              sameAs: href,
            };
          }),
        };
        type = 'profile';
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
          published: schema.published,
          sharedContent: {
            '@type': 'Article',
            title: schema.title,
            description: schema.description,
            image: schema.image,
            url: resource.url,
            datePublished: schema.datePublished,
          },
        };

        if (resource.attributedTo) {
          const { origin } = new URL(resource.url);
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
              logo: resource.attributedTo.icon && resource.attributedTo.icon.href ? resource.attributedTo.icon.href : undefined,
            },
          };
        }

        type = 'article';
        title = createTitle([resource.name, resource.attributedTo.name]);
        break;
      default:
        type = 'website';
        title = createTitle();
        break;
    }

    titleTag = (
      <title>{title}</title>
    );
    ogType = (
      <meta key="og:type" property="og:type" content={type} />
    );
  }

  console.log(schema);

  return (
    <Head>
      {titleTag}
      {ogTitle}
      {ogUrl}
      {ogDescription}
      {ogImage}
      {ogType}
      <script key="schema" type="application/ld+json">{JSON.stringify(schema)}</script>
    </Head>
  );
}

export default Meta;
