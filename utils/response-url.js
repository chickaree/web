import { decode } from 'base64url';

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

export default getResponseUrl;
