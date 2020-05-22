import Head from 'next/head';

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
  if (!resource) {
    return null;
  }

  let ogTitle;
  if (resource.name) {
    ogTitle = (
      <meta key="og:title" property="og:title" content={resource.name} />
    );
  }

  let ogDescription;
  if (resource.summary) {
    ogDescription = (
      <meta key="og:description" property="og:description" content={resource.summary} />
    );
  }

  let ogImage;
  if (resource.image && resource.image.href) {
    ogImage = (
      <meta key="og:image" property="og:image" content={resource.image.href} />
    );
  }

  let titleTag;
  let ogType;
  if (resource.type) {
    let type;
    let title;
    switch (resource.type) {
      case 'OrderedCollection':
        type = 'profile';
        if (resource.name) {
          title = createTitle(resource.name);
        } else if (resource.attributedTo && resource.attributedTo.name) {
          title = createTitle(resource.attributedTo.name);
        }
        break;
      case 'Article':
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


  return (
    <Head>
      {titleTag}
      {ogTitle}
      {ogDescription}
      {ogImage}
      {ogType}
    </Head>
  );
}

export default Meta;
