import { encode } from 'base64url';

function getResourcePath(resource) {
  const url = new URL(resource);
  const path = url.href.substr(url.origin.length);

  return path === '/' ? `/${url.host}` : `/${url.host}/${encode(path.substr(1))}`;
}

export default getResourcePath;
