import { DateTime } from 'luxon';
import ResourceLink from './resource-link';

function Image({ href, src, alt }) {
  if (!src) {
    return null;
  }

  return (
    <div className="embed-responsive embed-responsive-16by9">
      <a href={href}>
        <img src={src} alt={alt} className="embed-responsive-item" />
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
    <div className="col-1">
      <ResourceLink resource={resource}>
        <a>
          <img src={src} alt={alt} className="w-100" />
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
    <div className="col-auto">
      <time dateTime={datetime} className="small">
        <ResourceLink resource={href}>
          {DateTime.fromISO(datetime).toLocaleString(DateTime.DATETIME_SHORT)}
        </ResourceLink>
      </time>
    </div>
  );
}

function Article({
  source,
  title,
  datePublished,
  url,
  description,
  icon,
  banner,
  sitename,
}) {
  const { origin, host } = new URL(source);

  return (
    <div className="row mb-3">
      <div className="col-lg-8 offset-lg-2 col feed-item">
        <div className="card">
          <div className="card-header">
            <div className="row align-items-center">
              <Icon resource={source} src={icon} alt={sitename} />
              <div className={icon ? 'col-11' : 'col'}>
                <div className="row align-items-center justify-content-between">
                  <div className="col-auto">
                    <h5 className="mb-0">
                      <ResourceLink resource={source}>
                        <a>
                          {sitename}
                        </a>
                      </ResourceLink>
                    </h5>
                    <h6 className="small mb-0">
                      <ResourceLink resource={origin}>
                        <a>{host}</a>
                      </ResourceLink>
                    </h6>
                  </div>
                  <DatePublished datetime={datePublished} href={url} />
                </div>
              </div>
            </div>
          </div>
          <Image href={url} src={banner} alt={title} />
          <div className="card-body">
            <h4 className="card-title">
              <a href={url}>{title}</a>
            </h4>
            <Description text={description} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Article;