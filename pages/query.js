import { useRef, useEffect } from 'react';
import Buffer from 'buffer';
import Link from 'next/link';
import Router from 'next/router';
import fetch from 'isomorphic-unfetch';
import cherrio from 'cheerio';
import { encode, decode } from 'base62.io';
import Layout from '../components/layout';

const getLinkData = (rawURL) => {
  const url = new URL(rawURL);
  const path = url.href.substr(url.origin.length);

  return {
    as: path === '/' ? `/${url.host}` : `/${url.host}/${encode(path.substr(1))}`,
    href: path === '/' ? `/query?host=${url.host}` : `/query?host=${url.host}&path=${encode(path.substr(1))}`,
  };
};

const keepPosition = (win, doc) => {
  const height = document.body.clientHeight;
  return () => {
    win.scrollTo(0, win.scrollY + document.body.clientHeight - height);
  };
}

const Banner = ({ src, alt }) => {
  const container = useRef(undefined);

  // Load the image first to prevent the user from being scrolled.
  useEffect(() => {
    if (!container.current) {
      return;
    }
    const doc = container.current.ownerDocument;
    const win = doc.defaultView || doc.parentWindow;

    // Remove any elements in the container without scrolling the user.
    while (container.current.firstChild) {
      const keep = keepPosition(win, doc);
      container.current.removeChild(container.current.firstChild);
      keep();
    }

    const keep = keepPosition(win, doc);
    const image = doc.createElement('img');
    image.src = src;
    image.alt = alt;
    image.classList.add('w-100');
    image.onload = () => {
      container.current.appendChild(image);
      keep();
    };
  });

  if (!src) {
    return null;
  }

  return (
    <div ref={container} className="banner" />
  );
}

const Query = ({ data, sitename, description, banner, icon, feeds }) => {
  let className = [
    'container',
  ];

  if (banner) {
    className = [
      ...className,
      'has-banner'
    ];
  }

  return (
    <Layout>
      <Banner src={banner} alt={sitename} />
      <div className={className.join(' ')}>
        <div className="row mt-3">
          <div className="col-4 col-lg-2">
            <img src={icon} alt={sitename} className="icon w-100 img-thumbnail" />
          </div>
          <div className="col-auto">
            <h2>{sitename}</h2>
          </div>
          <div className="col-12 col-lg">
            <p>{description}</p>
          </div>
        </div>
        <div className="row">
          <div className="col">
            {feeds.map(feed => {

              return (
                <div key={feed.href}>
                  <Link {...getLinkData(feed.href)}>{feed.title}</Link> - {feed.href}
                </div>
              );
            })}
            <code style={{overflowWrap: 'break-word'}}>{data}</code>
          </div>
        </div>
      </div>
    </Layout>
  );
};

Query.getInitialProps = async ({ query, res }) => {
  const { host, path: rawPath } = query;

  const path = rawPath ? `/${decode(path)}` : '/';

  if ( !host ) {
    // @TODO Translate!
    throw new Error('No host provided');
  }

  const response = await fetch(`https://${host}${path}`, {
    redirect: 'manual',
  });
  if (!response.ok && response.headers.has('Location')) {
    const { as, href } = getLinkData(response.headers.get('Location'));
    if (res) {
      res.writeHead(response.status, {
        'Location': as
      });
      res.end();
      return;
    }

    Router.push(href, as);
    return;
  }

  const data = await response.text();

  const $ = cherrio.load(data);

  const head = $('head');
  const sitename = $('meta[property="og:site_name"], meta[name="og:site_name"]', head).last().attr('content');
  const description = $('meta[property="og:description"], meta[name="og:description"]', head).last().attr('content');
  const banner = $('meta[property="og:image"], meta[name="og:image"]', head).last().attr('content');
  const icons = $('link[rel="icon"], link[rel="apple-touch-icon"]', head).toArray().map(link => link.attribs).filter(link => !!link.href).sort((a, b) => {
    // Prefer larger.
    if (!a.sizes || !b.sizes) {
      return 0;
    }

    const aSize = parseInt(a.sizes.split('x')[0], 10);
    const bSize = parseInt(b.sizes.split('x')[0], 10);

    return bSize - aSize;
  });
  const feeds = $('link[rel="alternate"]').toArray().map(link => link.attribs).sort((a, b) => {
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
  }).reduce((acc, feed) => {
    // If the feed is missing an href, it should not be considered.
    if (!feed.href) {
      return acc;
    }

    // Dedupe the feeds by the title.
    if (acc.find(f => f.title === feed.title)) {
      return acc;
    }

    return [
      ...acc,
      feed
    ];
  }, []).sort((a, b) => {
    if (!a.title || !b.title) {
      return 0;
    }

    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();

    if (aTitle < bTitle) {
      return -1;
    }
    if (aTitle > bTitle) {
      return 1;
    }

    return 0;
  }).map(feed => ({
    ...feed,
    href: feed.href ? new URL(feed.href, response.url).href : null,
  }));

  return {
    data,
    sitename,
    description,
    banner: banner ? new URL(banner, response.url).href : null,
    icon: icons.length > 0 ? new URL(icons[0].href, response.url).href : null,
    feeds,
  };
}

export default Query;
