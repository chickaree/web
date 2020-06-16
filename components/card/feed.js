import Card from "../card";
import ResourceLink from '../resource-link';
import Icon from '../icon';
import getLinkHref from "../../utils/link-href";

function Image({ href, src, alt }) {
  if (!src) {
    return null;
  }

  return (
    <>
      <div className="embed-responsive embed-responsive-21by9 card-img-top">
        <ResourceLink resource={href}>
          <a>
            <img src={src} alt={alt} className="embed-responsive-item" loading="lazy" />
          </a>
        </ResourceLink>
      </div>
    </>
  );
}

function FeedIcon({ href, src, alt }) {
  if (!src) {
    return null;
  }

  return (
    <ResourceLink resource={href}>
      <a className="feed-icon d-block">
        <Icon src={src} alt={alt} />
      </a>
    </ResourceLink>
  );
}

function Description({ description }) {
  if (!description) {
    return null;
  }

  return (
    <div className="card-text">{description}</div>
  );
}

function Feed({
  name,
  summary,
  url,
  image,
  icon,
  attributedTo = {},
}) {
  const imgSrc = getLinkHref(image);

  const iconSrc = getLinkHref(icon) || getLinkHref(attributedTo.icon);

  let className = [];
  if (imgSrc) {
    className = [
      ...className,
      'has-image',
    ];
  }

  return (
    <Card>
      <div className={className.join(' ')}>
        <Image href={url} src={imgSrc} alt={name} />
        <div className="card-body">
          <div className="row">
            <div className={iconSrc ? 'col-3 col-md-2' : ''}>
              <FeedIcon href={url} src={iconSrc} alt={name} />
            </div>
            <div className="col">
              <h4 className="card-title">
                <ResourceLink resource={url}><a>{name}</a></ResourceLink>
              </h4>
              <Description description={summary} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default Feed;
