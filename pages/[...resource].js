import { useRef, useEffect, useState } from 'react';
import Router, { useRouter } from 'next/router';
import Link from 'next/link';
import cherrio from 'cheerio';
import { encode, decode } from 'base64url';
import Layout from '../components/layout';

const getLinkData = (rawURL) => {
  const url = new URL(rawURL);
  const path = url.href.substr(url.origin.length);

  return {
    as: path === '/' ? `/${url.host}` : `/${url.host}/${encode(path.substr(1))}`,
    href: '/[...resource]',
  };
};

function keepPosition(win, doc) {
  return (callback) => {
    const height = doc.body.clientHeight;
    callback();
    win.scrollTo(0, win.scrollY + doc.body.clientHeight - height);
  };
}

function Banner({ src, alt }) {
  const container = useRef(undefined);

  // Load the image first to prevent the user from being scrolled.
  useEffect(() => {
    if (!container.current) {
      return;
    }

    const doc = container.current.ownerDocument;
    const win = doc.defaultView || doc.parentWindow;

    const keep = keepPosition(win, doc);

    // Remove any elements in the container without scrolling the user.
    while (container.current.firstChild) {
      keep(() => container.current.removeChild(container.current.firstChild));
    }

    const image = doc.createElement('img');
    image.src = src;
    image.alt = alt;
    image.classList.add('w-100');
    image.onload = () => {
      // Add the image and prevent the user from being scrolled.
      keep(() => container.current.appendChild(image));
    };
  });

  if (!src) {
    return null;
  }

  return (
    <div ref={container} className="banner" />
  );
}

function Icon({ src, alt }) {
  if (!src) {
    return null;
  }

  return (
    <div className="embed-responsive embed-responsive-1by1">
      <div className="embed-responsive-item border rounded p-1">
        <div className="row align-items-center h-100">
          <div className="col">
            <img src={src} alt={alt} className="w-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

function WebsiteIcon({ src, alt }) {
  if (!src) {
    return null;
  }

  return (
    <div className="col-4 col-lg-2">
      <div className="icon">
        <Icon src={src} alt={alt} />
      </div>
    </div>
  );
}

function FeedIcon({ href: url, src, alt }) {
  if (!src) {
    return null;
  }

  const { as, href } = getLinkData(url);
  return (
    <Link as={as} href={href}>
      <a className="d-block">
        <Icon src={src} alt={alt} />
      </a>
    </Link>
  );
}

function WebsiteDescription({ description }) {
  if (!description) {
    return null;
  }

  return (
    <div className="col-12 col-lg">
      <p>{description}</p>
    </div>
  );
}

function FeedDescription({ description }) {
  if (!description) {
    return null;
  }

  return (
    <p>{description}</p>
  );
}

function FeedList({ feeds: feedList, hasIcon }) {
  if (!feedList || !feedList.length) {
    return null;
  }

  // Remove duplicate feeds.
  const feeds = [...feedList.reduce((map, feed) => {
    map.set(feed.feed_url, feed);
    return map;
  }, new Map()).values()];

  const hasFeedIcons = !!feeds.filter((feed) => !!feed.icon).length;

  return (
    <div className="row mb-3">
      <div className={hasIcon ? 'col-lg-10 offset-lg-2 col' : 'col'}>
        <div className="card">
          <ol className="list-group list-group-flush">
            {feeds.map((feed) => {
              const { href, as } = getLinkData(feed.feed_url);

              return (
                <li className="list-group-item" key={feed.feed_url}>
                  <div className="row">
                    <div className={hasFeedIcons ? 'col-3 col-md-2' : ''}>
                      <FeedIcon href={feed.feed_url} src={feed.icon} alt={feed.title} />
                    </div>
                    <div className="col">
                      <h5>
                        <Link href={href} as={as}><a>{feed.title}</a></Link>
                      </h5>
                      <FeedDescription description={feed.description} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}

async function fetchResource(resource, init) {
  try {
    return await fetch(resource, init);
  } catch (e) {
    const url = new URL(resource);
    const path = url.href.substr(url.origin.length);
    const hash = path === '/' ? '' : encode(path.substring(1));
    const remoteResource = `${url.host}${hash ? `/${hash}` : ''}`;
    // Try the proxy!
    return fetch(`https://chickar.ee/api/${remoteResource}`, init);
  }
}

function getResponseUrl(response) {
  const url = new URL(response.url);

  // Reset the response URL if the proxy was used.
  if (url.host === 'chickar.ee') {
    const parts = url.pathname.split('/');
    const domain = parts[2];
    const path = parts[3] ? `/${decode(parts[3])}` : '/';
    return new URL(path, `https://${domain}`);
  }

  return url;
}

async function getResource(domain, hash) {
  const path = hash ? `/${decode(hash)}` : '/';

  if (!domain) {
    // @TODO Translate!
    throw new Error('No host provided');
  }

  const resource = `https://${domain}${path}`;

  const response = await fetchResource(resource);

  const responseUrl = getResponseUrl(response);

  // If the repsonse was redirected, update the URL.
  if (response.redirected) {
    const { as, href } = getLinkData(responseUrl.toString());
    Router.replace(href, as);
  }

  const data = await response.text();

  const $ = cherrio.load(data);

  const head = $('head');
  let sitename = $('meta[property="og:site_name"], meta[name="og:site_name"]', head).last().attr('content');
  if (!sitename) {
    sitename = $('meta[name="application-name"]', head).last().attr('content');
  }
  if (!sitename) {
    sitename = $('title', head).last().text();
  }
  let description = $('meta[property="og:description"], meta[name="og:description"]', head).last().attr('content');
  if (!description) {
    description = $('meta[name="description"]', head).last().attr('content');
  }
  const banner = $('meta[property="og:image"], meta[name="og:image"]', head).last().attr('content');
  const icons = $('link[rel="icon"], link[rel="apple-touch-icon"]', head).toArray().map(({ attribs }) => attribs).filter((link) => !!link.href)
    .sort((a, b) => {
    // Prefer larger.
      if (!a.sizes || !b.sizes) {
        return 0;
      }

      const aSize = parseInt(a.sizes.split('x')[0], 10);
      const bSize = parseInt(b.sizes.split('x')[0], 10);

      return bSize - aSize;
    });
  const feeds = await Promise.all($('link[rel="alternate"]').toArray().map((link, index) => ({
    ...link.attribs,
    order: index,
  })).filter((feed) => {
    // If the feed is missing an href, it should not be considered.
    if (!feed.href) {
      return false;
    }

    // Only include feeds that are types we know how to deal with.
    if (!feed.type || !['application/json', 'application/rss+xml'].includes(feed.type)) {
      return false;
    }

    return true;
  })
    .sort((a, b) => {
    // Prefer JSON.
      if (!a.type || !b.type) {
        return 0;
      }

      if (a.type === b.type) {
        return 0;
      }

      if (a.type === 'application/json') {
        return -1;
      }

      if (b.type === 'application/json') {
        return 1;
      }

      return 0;
    })
    .reduce((acc, feed) => {
    // Dedupe the feeds by the title.
      if (acc.find((f) => f.title === feed.title)) {
        return acc;
      }

      return [
        ...acc,
        feed,
      ];
    }, [])
    .sort((a, b) => a.order - b.order)
    .map((feed) => ({
      ...feed,
      href: feed.href ? new URL(feed.href, responseUrl).toString() : null,
    }))
    .map(async (feed) => {
      const feedResponse = await fetchResource(feed.href);
      const feedResponseUrl = getResponseUrl(feedResponse);

      if (feedResponse.headers.has('Content-Type') && feedResponse.headers.get('Content-Type').includes('application/json')) {
        const feedData = await feedResponse.json();
        return {
          title: feedData.title || '',
          icon: feedData.icon,
          feed_url: feedResponseUrl.toString(),
          description: feedData.description || '',
        };
      }

      const feedData = await feedResponse.text();
      const feed$ = cherrio.load(feedData, {
        xmlMode: true,
      });

      let root = feed$.root().children().first();
      if (root.is('rss')) {
        root = root.children().first();
      }

      if (root.is('channel')) {
        return {
          title: feed$('> title', root).last().text(),
          feed_url: feedResponseUrl.toString(),
          icon: feed$('> image > url', root).last().text(),
          description: feed$('> description', root).last().text(),
        };
      }

      if (root.is('feed')) {
        return {
          title: feed$('> title', root).last().text(),
          feed_url: feedResponseUrl.toString(),
          icon: feed$('> icon', root).last().text(),
          description: feed$('> description', root).last().text(),
        };
      }

      return {
        title: feed.title || '',
        feed_url: feedResponseUrl.toString(),
        description: '',
      };
    }));

  return {
    sitename,
    description,
    banner: banner ? new URL(banner, responseUrl).href : null,
    icon: icons.length > 0 ? new URL(icons[0].href, responseUrl).href : null,
    feeds,
  };
}

function Resource() {
  const router = useRouter();
  const { resource } = router.query;
  const [domain, hash] = resource || [];

  const [state, setState] = useState({
    sitename: '',
    description: '',
    banner: null,
    icon: null,
    feeds: [],
  });

  useEffect(() => {
    if (!domain) {
      return;
    }

    getResource(domain, hash).then((data) => {
      if (data) {
        setState(data);
      }
    });
  }, [domain, hash]);

  const {
    sitename,
    description,
    banner,
    icon,
    feeds,
  } = state;

  let className = [
    'container',
  ];

  if (banner) {
    className = [
      ...className,
      'has-banner',
    ];
  }

  return (
    <Layout>
      <Banner src={banner} alt={sitename} />
      <div className={className.join(' ')}>
        <div className="row mt-3">
          <WebsiteIcon src={icon} alt={sitename} />
          <div className="col">
            <div className="row">
              <div className="col-12 col-lg-auto">
                <h2>{sitename}</h2>
              </div>
              <WebsiteDescription description={description} />
            </div>
          </div>
        </div>
        <FeedList feeds={feeds} hasIcon={!!icon} />
      </div>
    </Layout>
  );
}

export default Resource;
