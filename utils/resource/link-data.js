import getResourcePath from './path';

function getResourceLinkData(resource) {
  return {
    as: getResourcePath(resource),
    href: '/[...resource]',
  };
}

export default getResourceLinkData;
