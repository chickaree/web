import getSafeAssetUrl from '../safe-asset-url';
import getResponseUrl from '../response-url';

function getResponseDataHTML(response, doc) {
  const url = getResponseUrl(response);

  const head = doc.querySelector('head');
  let title = head.querySelector('meta[property="og:site_name"], meta[name="og:site_name"]').getAttribute('content');
  if (!title) {
    title = head.querySelector('meta[name="application-name"]').getAttribute('content');
  }
  let description = head.querySelector('meta[property="og:description"], meta[name="og:description"]').getAttribute('content');
  if (!description) {
    description = head.querySelector('meta[name="description"]').getAttribute('content');
  }
  const banner = head.querySelector('meta[property="og:image"], meta[name="og:image"]').getAttribute('content');
  const icons = [...head.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').values()].filter((element) => !!element.hasAttribute('href'))
    .sort((a, b) => {
    // Prefer larger.
      if (!a.hasAttribute('sizes') || !b.hasAttribute('sizes')) {
        return 0;
      }

      const aSize = parseInt(a.getAttribute('sizes').split('x')[0], 10);
      const bSize = parseInt(b.getAttribute('sizes').split('x')[0], 10);

      return bSize - aSize;
    });
  const feeds = [...head.querySelectorAll('link[rel="alternate"]').values()].map((link, index) => ({
    link,
    order: index,
  })).filter(({ link }) => {
    // If the feed is missing an href, it should not be considered.
    if (!link.hasAttribute('href')) {
      return false;
    }

    // Only include feeds that are types we know how to deal with.
    if (!link.hasAttribute('type') || !['application/json', 'application/rss+xml'].includes(link.getAttribute('type'))) {
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

  return {
    type: 'website',
    resource: {
      url: url.toString(),
      title,
      description,
      banner: banner ? getSafeAssetUrl(banner, url.toString()) : null,
      icon: icons.length > 0 ? getSafeAssetUrl(icons[0].href, url.toString()) : null,
      feeds,
    },
  };
}

export default getResponseDataHTML;
