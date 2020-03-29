import { encode } from 'base64url';

function getResourceLinkData(resource) {
  const url = new URL(resource);
  const path = url.href.substr(url.origin.length);

  return {
    as: path === '/' ? `/${url.host}` : `/${url.host}/${encode(path.substr(1))}`,
    href: '/[...resource]',
  };
}

export default getResourceLinkData;
