import getSafeAssetUrl from './safe-asset-url';

function getImageObj(url, base) {
  if (!url) {
    return null;
  }

  return {
    type: 'Link',
    href: getSafeAssetUrl(url, base),
  };
}

export default getImageObj;
