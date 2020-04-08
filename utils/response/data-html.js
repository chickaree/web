import getSafeAssetUrl from '../safe-asset-url';
import getResponseUrl from '../response-url';
import createQueryText from '../query-text';
import jsonldFrame from '../jsonld-frame';
import toArray from '../to-array';
import fetchResource from '../fetch-resource';

function createAttribute(doc) {
  return (querySelector, attribute) => {
    const element = doc.querySelector(querySelector);
    return element && element.hasAttribute(attribute) ? element.getAttribute(attribute) : null;
  };
}

async function getManifest(url) {
  const response = await fetchResource(url).toPromise();
  return response.json();
}

async function getResponseDataHTML(response, doc) {
  const url = getResponseUrl(response);
  const head = doc.querySelector('head');
  const attribute = createAttribute(head);
  const text = createQueryText(head);

  let type = '';
  let sitename;
  let title;
  let description;
  let banner;
  let icon;

  const manifestHref = attribute('link[rel="manifest"]', 'href');
  if (manifestHref) {
    const manifestURL = new URL(manifestHref, url.toString());
    const manifest = await getManifest(manifestURL.toString());
    sitename = manifest.name || sitename;
    const appIcons = toArray(manifest.icons)
      .filter((i) => !!i.sizes)
      .map((i) => ({
        ...i,
        sizes: i.sizes.split(' ').map((size) => (
          size.split('x').map((num) => parseInt(num, 10))
        )).filter(([width, height]) => width === height).sort(([a], [b]) => a - b),
      }))
      .sort((a, b) => {
        const [aSize] = a.sizes;
        const [bSize] = b.sizes;

        const [aWidth] = aSize;
        const [bWidth] = bSize;

        if (aWidth > bWidth) {
          return -1;
        }

        if (bWidth > aWidth) {
          return 1;
        }

        return 0;
      });

    icon = appIcons.length > 0 && appIcons[0].src ? appIcons[0].src : icon;
  }

  let node;
  const jsonNodes = doc.querySelectorAll('script[type="application/ld+json"]');
  if (jsonNodes.length > 0) {
    if (url.hash && jsonNodes.length > 1) {
      const id = url.hash.substring(1);
      node = [...jsonNodes.values()].filter((n) => n.id === id);
    } else {
      [node] = jsonNodes;
    }
  }

  if (node) {
    try {
      const json = JSON.parse(node.textContent);
      const jsonld = await jsonldFrame(json, url.toString());
      const data = jsonld['@graph'] ? jsonld['@graph'][0] : jsonld;
      switch (data.type) {
        case 'Article':
        case 'NewsArticle': {
          type = 'article';
          title = data.name || data.headline || title;
          description = data.description || data.headline || description;

          const publisher = toArray(data.publisher).filter(({ name }) => !!name);
          sitename = publisher.length > 0 && publisher[0].name ? publisher[0].name : sitename;

          const ratio = 16 / 9;
          const image = toArray(data.image).filter((i) => typeof i !== 'string' || !!i.url).sort((a, b) => {
            if (!a.width || !b.width) {
              return 0;
            }

            if (!a.height || !b.height) {
              return 0;
            }

            const aRatio = a.width / a.height;
            const bRatio = b.width / b.height;

            const aDiff = aRatio > ratio ? aRatio - ratio : ratio - aRatio;
            const bDiff = bRatio > ratio ? bRatio - ratio : ratio - bRatio;

            return aDiff - bDiff;
          });

          if (image.length > 0) {
            if (typeof image[0] === 'string') {
              [banner] = image;
            } else if (image[0].url) {
              banner = image[0].url;
            }
          }
          break;
        }
        case 'Website':
          type = 'website';
          break;
        default:
          break;
      }
    } catch (e) {
      // Silence is Golden.
    }
  }

  if (!type) {
    // If it's the root of the site, always assume it's a website.
    if (url.pathname === '/') {
      type = 'website';
    } else {
      type = attribute('meta[property="og:type"], meta[name="og:type"]', 'content');
      if (!type) {
        type = 'article';
      }
    }
  }

  if (!title) {
    title = attribute('meta[property="og:title"], meta[name="og:title"]', 'content');
  }
  if (!title) {
    title = text('title');
  }

  if (!sitename) {
    sitename = attribute('meta[property="og:site_name"], meta[name="og:site_name"]', 'content');
  }
  if (!sitename) {
    sitename = attribute('meta[name="application-name"]', 'content');
  }
  if (!sitename) {
    sitename = text('title');
  }

  if (!description) {
    description = attribute('meta[property="og:description"], meta[name="og:description"]', 'content');
  }
  if (!description) {
    description = attribute('meta[name="description"]', 'content');
  }

  if (!banner) {
    banner = attribute('meta[property="og:image"], meta[name="og:image"]', 'content');
  }

  if (!icon) {
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

    icon = icons.length > 0 ? icons[0] : icon;
  }

  const feeds = [...head.querySelectorAll('link[rel="alternate"]').values()].map((link, index) => ({
    link,
    order: index,
  })).filter(({ link }) => {
    // If the feed is missing an href, it should not be considered.
    if (!link.hasAttribute('href')) {
      return false;
    }

    // If the link is missing a type, it's not a feed.
    if (!link.hasAttribute('type')) {
      return false;
    }

    // Only include types we currently support.
    if (!['application/json', 'application/xml', 'application/rss+xml', 'application/atom+xml', 'text/xml'].includes(link.getAttribute('type'))) {
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
    type,
    resource: {
      url: url.toString(),
      title,
      sitename,
      description,
      banner: banner ? getSafeAssetUrl(banner, url.toString()) : null,
      icon: icon ? getSafeAssetUrl(icon, url.toString()) : null,
      feeds,
    },
  };
}

export default getResponseDataHTML;
