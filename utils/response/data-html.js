import { DateTime } from 'luxon';
import getSafeAssetUrl from '../safe-asset-url';
import getResponseUrl from '../response-url';
import createQueryText from '../query-text';
import jsonldFrame from '../jsonld-frame';
import toArray from '../to-array';
import { Article, WebPage, ItemList } from '../../tree/schema';
import getResourceLinkData from '../resource-link-data';
// import fetchResource from '../fetch-resource';

const supportedTypes = [
  'website',
  'feed',
  'article',
];

function createAttribute(doc) {
  return (querySelector, attribute) => {
    const element = doc.querySelector(querySelector);
    return element && element.hasAttribute(attribute) ? element.getAttribute(attribute) : null;
  };
}

function intersection(a, b) {
  return a.filter((x) => b.includes(x));
}

function getImageObj(url, base) {
  if (!url) {
    return null;
  }

  return {
    type: 'Link',
    href: getSafeAssetUrl(url, base),
  };
}

function getBestImages(data, ratio) {
  return toArray(data || []).filter((i) => typeof i !== 'string' || !!i.url).sort((a, b) => {
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
  }).reduce((acc, img) => {
    // Remove any images that do not fit the ratio of the first image.
    if (acc.length === 0) {
      return [
        img,
      ];
    }

    if (!acc[0].width || !acc[0].height) {
      return [
        ...acc,
        img,
      ];
    }

    const firstRatio = acc[0].width / acc[0].height;
    const currRatio = img.width / img.height;

    if (firstRatio !== currRatio) {
      return acc;
    }

    return [
      ...acc,
      img,
    ];
  }, [])
    .sort((a, b) => {
      if (!a.width || !b.width) {
        return 0;
      }

      return a.width - b.width;
    });
}

// async function getManifest(url) {
//   const response = await fetchResource(url).toPromise();
//   return response.json();
// }

async function getResponseDataHTML(response, doc) {
  const url = getResponseUrl(response);
  const head = doc.querySelector('head');
  const attribute = createAttribute(head);
  const text = createQueryText(head);

  const obj = {
    attributedTo: {},
  };

  // @TODO Get the "canonical" url

  // const manifestHref = attribute('link[rel="manifest"]', 'href');
  // if (manifestHref) {
  //   manifest = new URL(manifestHref, url.toString());
  //   // @TODO Move this higher up so we aren't getting it on every result.
  //   const manifest = await getManifest(manifestURL.toString());
  //   sitename = manifest.name || sitename;
  //   const appIcons = toArray(manifest.icons)
  //     .filter((i) => !!i.sizes)
  //     .map((i) => ({
  //       ...i,
  //       sizes: i.sizes.split(' ').map((size) => (
  //         size.split('x').map((num) => parseInt(num, 10))
  //       )).filter(([width, height]) => width === height).sort(([a], [b]) => a - b),
  //     }))
  //     .sort((a, b) => {
  //       const [aSize] = a.sizes;
  //       const [bSize] = b.sizes;

  //       const [aWidth] = aSize;
  //       const [bWidth] = bSize;

  //       if (aWidth > bWidth) {
  //         return -1;
  //       }

  //       if (bWidth > aWidth) {
  //         return 1;
  //       }

  //       return 0;
  //     });

  //   icon = appIcons.length > 0 && appIcons[0].src ? appIcons[0].src : icon;
  // }

  if (!obj.attributedTo.icon) {
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

    obj.attributedTo.icon = icons.length > 0 ? getImageObj(icons[0], url) : obj.attributedTo.icon;
  }

  let jsonDocs = [];
  const jsonNodes = doc.querySelectorAll('script[type="application/ld+json"]');
  if (jsonNodes.length > 0) {
    if (url.hash && jsonNodes.length > 1) {
      const id = url.hash.substring(1);
      jsonDocs = [...jsonNodes.values()].filter((n) => n.id === id).map((n) => n.textContent);
    } else {
      jsonDocs = [...jsonNodes.values()].map((n) => n.textContent);
    }
  }

  if (jsonDocs) {
    try {
      const docs = jsonDocs.map((json) => JSON.parse(json));

      // @TODO Use the canonical?
      const jsonld = await jsonldFrame(docs, {
        mainEntityOfPage: url.toString(),
        mainEntity: {},
      });

      // @TODO Get the most "relevant"? or maybe concatenate everything?
      const data = jsonld['@graph'] ? jsonld['@graph'][0] : jsonld;

      let mainCreativeWork;

      if (intersection(toArray(data.type), Article).length) {
        obj.type = 'Note';
        obj.attachment = {
          type: 'Article',
        };
        mainCreativeWork = data;
      }

      if (intersection(toArray(data.type), WebPage).length) {
        // @TODO This seems like a lie...
        obj.type = 'Collection';
        mainCreativeWork = data;
        if (data.mainEntity) {
          obj.items = toArray(data.mainEntity.itemListElement || []).map((item) => ({
            type: 'Link',
            href: item.url,
          }));
        }
      }

      if (intersection(toArray(data.type), ItemList).length) {
        obj.type = 'Collection';
        obj.items = toArray(data.itemListElement || []).map((item) => ({
          type: 'Link',
          href: item.url,
        }));
        if (data.mainEntityOfPage) {
          mainCreativeWork = data.mainEntityOfPage;
        }
      }

      // The "main" object is either the obj or an attachment.
      const mainObj = obj.attachment ? obj.attachment : obj;

      if (mainCreativeWork) {
        mainObj.name = mainCreativeWork.name || mainCreativeWork.headline || mainObj.name;
        mainObj.summary = mainCreativeWork.description || mainCreativeWork.headline || mainObj.summary;

        if (data.datePublished) {
          try {
            obj.published = DateTime.fromISO(data.datePublished, { zone: 'utc' }).toISO();
          } catch (e) {
            // Silence is Golden.
          }
        }

        if (mainCreativeWork.publisher) {
          const publishers = await jsonldFrame(docs, {
            id: toArray(mainCreativeWork.publisher).map((p) => p.id),
          });

          // What do we do if there is more than one?
          // Maybe use Intl.ListFormat and a pollyfill?
          const publisher = publishers['@graph'] ? publishers['@graph'][0] : publishers;

          obj.attributedTo.name = publisher.name || obj.attributedTo.name;
          obj.attributedTo.summary = publisher.description || obj.attributedTo.summary;
          // @TODO Should this be image if it's a Person and... logo if it's an org?
          const publisherImage = getBestImages([
            ...toArray(publisher.logo || []),
            ...toArray(publisher.brand && publisher.brand.logo ? publisher.brand.logo : []),
            ...toArray(publisher.image || []),
          ], 1);

          // @TODO Use response images... somehow.
          if (publisherImage.length > 0) {
            if (typeof publisherImage[0] === 'string') {
              obj.attributedTo.icon = getImageObj(publisherImage[0], url);
            } else if (publisherImage[0].url) {
              // Only override an existing icon if the width & height are a 1:1 ratio.
              if (obj.attributedTo.icon) {
                if (publisherImage[0].width / publisherImage[0].height === 1) {
                  obj.attributedTo.icon = getImageObj(publisherImage[0].url, url);
                }
              } else {
                obj.attributedTo.icon = getImageObj(publisherImage[0].url, url);
              }
            }
          }
        }

        const ratio = obj.type === 'Collection' ? 21 / 9 : 16 / 9;
        const image = getBestImages(mainCreativeWork.image, ratio);

        // @TODO Use response images... somehow.
        if (image.length > 0) {
          if (typeof image[0] === 'string') {
            mainObj.image = getImageObj(image[0], url);
          } else if (image[0].url) {
            mainObj.image = getImageObj(image[0].url, url);
          }
        }
      }
    } catch (e) {
      // Silence is Golden.
    }
  }

  if (!obj.type) {
    // If it's the root of the site, always assume it's a collection.
    if (url.pathname === '/') {
      obj.type = 'Collection';
    } else {
      type = attribute('meta[property="og:type"], meta[name="og:type"]', 'content');
      if (type === 'website') {
        obj.type = 'Collection';
      } else {
        obj.type = 'Note';
        // @TODO Figure out how to handle other attachments.
        obj.attachment = {
          type: 'Article',
        };
      }
    }
  }

  const mainObj = obj.attachment ? obj.attachment : obj;

  if (!mainObj.name) {
    mainObj.name = attribute('meta[property="og:title"], meta[name="og:title"]', 'content');
  }
  if (!mainObj.name) {
    mainObj.name = text('title');
  }

  if (!obj.attributedTo.name) {
    obj.attributedTo.name = attribute('meta[property="og:site_name"], meta[name="og:site_name"]', 'content');
  }
  if (!obj.attributedTo.name) {
    obj.attributedTo.name = attribute('meta[name="application-name"]', 'content');
  }
  if (!obj.attributedTo.name) {
    obj.attributedTo.name = text('title');
  }

  if (!mainObj.summary) {
    mainObj.summary = attribute('meta[property="og:description"], meta[name="og:description"]', 'content');
  }
  if (!mainObj.summary) {
    mainObj.summary = attribute('meta[name="description"]', 'content');
  }

  if (!obj.attributedTo.image) {
    obj.attributedTo.image = getImageObj(attribute('meta[property="og:image"], meta[name="og:image"]', 'content'), url);
  }

  if (!obj.published) {
    const datetime = attribute('meta[property="article:published_time"], meta[name="article:published_time"]', 'content');
    if (datetime) {
      obj.published = DateTime.fromISO(datetime, { zone: 'utc' }).toISO();
    }
  }

  if (obj.type === 'Collection') {
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
      .map(({ link }) => ({
        type: 'Link',
        name: link.getAttribute('title'),
        href: (new URL(link.getAttribute('href'), url)).toString(),
      }));

    obj.items = [
      ...feeds,
      ...(obj.items || []),
    ];
  }

  console.log('OBJ', obj);

  return obj;
}

export default getResponseDataHTML;
