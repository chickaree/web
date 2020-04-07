function Image({ href, src, alt }) {
  if (!src) {
    return null;
  }

  return (
    <div className="embed-responsive embed-responsive-16by9">
      <a href={href}>
        <img src={src} alt={alt} className="card-img-top embed-responsive-item" />
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

function Article({
  resource: {
    title,
    url,
    description,
    icon,
    banner,
    sitename,
  },
}) {
  return (
    <div className="container">
      <div className="row mb-3 mt-4">
        <div className={icon ? 'col-lg-8 offset-lg-2 col' : 'col'}>
          <div className="card">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col-1">
                  <img src={icon} alt={sitename} className="w-100" />
                </div>
                <div className="col-auto">
                  <h5 className="mb-0">{sitename}</h5>
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
    </div>
  );
}

export default Article;
