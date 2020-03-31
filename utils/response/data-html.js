import getSafeAssetUrl from '../safe-asset-url';
import getResponseUrl from '../response-url';
import createQueryText from '../query-text';

function createAttribute(doc) {
  return (querySelector, attribute) => {
    const element = doc.querySelector(querySelector);
    return element && element.hasAttribute(attribute) ? element.getAttribute(attribute) : null;
  };
}

function getResponseDataHTML(response, doc) {
  const url = getResponseUrl(response);
  const head = doc.querySelector('head');
  const attribute = createAttribute(head);
  const text = createQueryText(head);

  let title = attribute('meta[property="og:site_name"], meta[name="og:site_name"]', 'content');
  if (!title) {
    title = attribute('meta[name="application-name"]', 'content');
  }
  if (!title) {
    title = text('title');
  }
  let description = attribute('meta[property="og:description"], meta[name="og:description"]', 'content');
  if (!description) {
    description = attribute('meta[name="description"]', 'content');
  }
  const banner = attribute('meta[property="og:image"], meta[name="og:image"]', 'content');
  const icons = [...head.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').values()].filter((element) => !!element.hasAttribute('href'))
    .sort((a, b) => {
    // Prefer larger.
      if (!a.hasAttribute('sizes') || !b.hasAttribute('sizes')) {
        return 0;
      }

      const aSize = parseInt(a.getAttribute('sizes').split('x')[0], 10);
      const bSize = parseInt(b.getAttribute('sizes').split('x')[0], 10);

      return bSize - aSize;
    }).map((link) => link.getAttribute('href'));
  const feeds = [...head.querySelectorAll('link[rel="alternate"]').values()].map((link, index) => ({
    link,
    order: index,
  })).filter(({ link }) => {
    // If the feed is missing an href, it should not be considered.
    if (!link.hasAttribute('href')) {
      return false;
    }

    return true;
  })
    .sort(({ link: a }, { link: b }) => {
    // Prefer JSON.
      if (!a.hasAttribute('type') || !b.hasAttribute('type')) {
        return 0;
      }

      if (a.getAttribute('type') === b.getAttribute('type')) {
        return 0;
      }

      if (a.getAttribute('type') === 'application/json') {
        return -1;
      }

      if (b.getAttribute('type') === 'application/json') {
        return 1;
      }

      return 0;
    })
    .reduce((acc, item) => {
    // Dedupe the feeds by the title.
      if (acc.find((i) => i.link.getAttribute('title') === item.link.getAttribute('title'))) {
        return acc;
      }

      return [
        ...acc,
        item,
      ];
    }, [])
    .sort((a, b) => a.order - b.order)
    .map(({ link }) => (new URL(link.getAttribute('href'), url)).toString());

  console.log('FEEDS', feeds);

  return {
    type: 'website',
    resource: {
      url: url.toString(),
      title,
      description,
      banner: banner ? getSafeAssetUrl(banner, url.toString()) : null,
      icon: icons.length > 0 ? getSafeAssetUrl(icons[0], url.toString()) : null,
      feeds,
    },
  };
}

export default getResponseDataHTML;