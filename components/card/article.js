import { DateTime } from 'luxon';
import DOMPurify from 'dompurify';
import ResourceLink from '../resource-link';
import getLinkHref from '../../utils/link-href';
import Card from '../card';
import MIME_TYPES from '../../utils/mime-types';

function Image({ href, src, alt }) {
  if (!src) {
    return null;
  }

  return (
    <div className="embed-responsive embed-responsive-16by9">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <img src={src} alt={alt} className="embed-responsive-item" loading="lazy" />
      </a>
    </div>
  );
}

function Description({ text }) {
  if (!text) {
    return null;
  }

  const html = DOMPurify.sanitize(text, { ALLOWED_TAGS: ['strong', 'em'] });

  if (!html) {
    return null;
  }

  // eslint-disable-next-line react/no-danger
  return <p className="card-text" dangerouslySetInnerHTML={{ __html: html }} />;
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
  link,
}) {
  if (!datetime) {
    return null;
  }

  const dt = DateTime.fromISO(datetime);

  let format = DateTime.DATETIME_SHORT;
  if (dt.toLocal().startOf('day').equals(DateTime.local().startOf('day'))) {
    format = DateTime.TIME_SIMPLE;
  }

  let time = dt.toLocaleString(format);

  // If the resource can be handled provide a permalink.
  if (link && link.mediaType && MIME_TYPES.has(link.mediaType)) {
    time = (
      <ResourceLink resource={link.href}>
        <a>
          {time}
        </a>
      </ResourceLink>
    );
  }

  return (
    <div className="col text-right">
      <time dateTime={datetime} className="small">
        {time}
      </time>
    </div>
  );
}

function Article({
  name,
  published,
  updated,
  url = {},
  summary,
  image,
  context = {},
  attributedTo = {},
}) {
  const {
    url: contextUrl = {},
    name: contextName,
    icon: contextIcon,
    attributedTo: contextAttributedTo = {},
  } = context;

  const { origin, host } = new URL(url.href);
  const source = contextUrl.href || origin;

  const attributedName = contextName || contextAttributedTo.name || attributedTo.name;
  const attributedIcon = contextIcon || contextAttributedTo.icon || attributedTo.icon;

  return (
    <Card>
      <div className="card-header">
        <div className="row align-items-center">
          <Icon resource={source} src={getLinkHref(attributedIcon)} alt={attributedName} />
          <div className={attributedIcon ? 'col-10 col-md-11' : 'col'}>
            <div className="row align-items-center justify-content-between">
              <div className="col">
                <h5 className="mb-0">
                  <ResourceLink resource={source}>
                    <a>
                      {attributedName}
                    </a>
                  </ResourceLink>
                </h5>
                <h6 className="small mb-0">
                  <ResourceLink resource={origin}>
                    <a>{host}</a>
                  </ResourceLink>
                </h6>
              </div>
              <DatePublished datetime={published || updated} link={url} />
            </div>
          </div>
        </div>
      </div>
      <Image href={url.href} src={getLinkHref(image)} alt={name} />
      <div className="card-body">
        <h4 className="card-title">
          <a href={url.href} target="_blank" rel="noopener noreferrer">{name}</a>
        </h4>
        <Description text={summary} />
      </div>
    </Card>
  );
}

export default Article;
