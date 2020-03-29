import cherrio from 'cheerio';
import getSafeAssetUrl from './safe-asset-url';
import getResponseUrl from './response-url';

async function getFeedDataFromXmlResponse(response) {
  const url = getResponseUrl(response);
  const data = await response.text();
  const feed$ = cherrio.load(data, {
    xmlMode: true,
  });

  let root = feed$.root().children().first();
  if (root.is('rss')) {
    root = root.children().first();
  }

  if (root.is('channel')) {
    return {
      title: feed$('> title', root).last().text(),
      feed_url: url.toString(),
      icon: getSafeAssetUrl(feed$('> image > url', root).last().text(), url.toString()),
      description: feed$('> description', root).last().text(),
    };
  }

  if (root.is('feed')) {
    return {
      title: feed$('> title', root).last().text(),
      feed_url: url.toString(),
      icon: getSafeAssetUrl(feed$('> icon', root).last().text(), url.toString()),
      description: feed$('> description', root).last().text(),
    };
  }

  return null;
}

export default getFeedDataFromXmlResponse;
