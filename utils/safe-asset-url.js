function getSafeAssetUrl(href, base) {
  if (!href) {
    return null;
  }

  const url = new URL(href, base);

  // If the protocol is not https, the URL is not safe.
  if (url.protocol !== 'https:') {
    return null;
  }

  return url.toString();
}

export default getSafeAssetUrl;
