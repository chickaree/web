import Link from 'next/link';
import getResourceLinkData from '../utils/resource/link-data';

function ResourceLink({
  resource,
  children,
}) {
  const { as, href } = getResourceLinkData(resource);

  return (
    <Link as={as} href={href} prefetch={false}>
      {children}
    </Link>
  );
}

export default ResourceLink;
