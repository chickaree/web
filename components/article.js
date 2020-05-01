import { DateTime } from 'luxon';
import ResourceLink from './resource-link';
import getLinkHref from '../utils/link-href';
import Card from './card';

function Image({ href, src, alt }) {
  if (!src) {
    return null;
  }

  return (
    <div className="embed-responsive embed-responsive-16by9">
      <a href={href}>
        <img src={src} alt={alt} className="embed-responsive-item" loading="lazy" />
      </a>
    </div>
  );
}

function Description({ text }) {
  if (!text) {
    return null;
  }

  return <p className="card-text">{text}</p>;
}

function Icon({
  resource,
  src,
  alt,
}) {
  if (!src) {
    return null;
  }

  return (
    <div className="col-2 col-md-1 pr-0">
      <ResourceLink resource={resource}>
        <a className="embed-responsive embed-responsive-1by1">
          <img src={src} alt={alt} className="embed-responsive-item" loading="lazy" />
        </a>
      </ResourceLink>
    </div>
  );
}

function DatePublished({
  datetime,
  href,
}) {
  if (!datetime) {
    return null;
  }

  return (
    <div className="col text-right">
      <time dateTime={datetime} className="small">
        <ResourceLink resource={href}>
          <a>
            {DateTime.fromISO(datetime).toLocaleString(DateTime.DATETIME_SHORT)}
          </a>
        </ResourceLink>
      </time>
    </div>
  );
}

function Article({
  source,
  name,
  published,
  url,
  summary,
  icon,
  image,
  attributedTo = {},
}) {
  const { origin, host } = new URL(source);

  return (
    <Card>
      <div className="card-header">
        <div className="row align-items-center">
          <Icon resource={source} src={getLinkHref(attributedTo.icon)} alt={attributedTo.name} />
          <div className={icon ? 'col-10 col-md-11' : 'col'}>
            <div className="row align-items-center justify-content-between">
              <div className="col">
                <h5 className="mb-0">
                  <ResourceLink resource={source}>
                    <a>
                      {attributedTo.name}
                    </a>
                  </ResourceLink>
                </h5>
                <h6 className="small mb-0">
                  <ResourceLink resource={origin}>
                    <a>{host}</a>
                  </ResourceLink>
                </h6>
              </div>
              <DatePublished datetime={published} href={url} />
            </div>
          </div>
        </div>
      </div>
      <Image href={url} src={getLinkHref(image)} alt={name} />
      <div className="card-body">
        <h4 className="card-title">
          <a href={url}>{name}</a>
        </h4>
        <Description text={summary} />
      </div>
    </Card>
  );
}

export default Article;
