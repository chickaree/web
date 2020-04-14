import Icon from './icon';

function ListingIcon({ src, alt }) {
  if (!src) {
    return null;
  }

  return (
    <div className="col-4 col-lg-2">
      <div className="icon">
        <Icon src={src} alt={alt} />
      </div>
    </div>
  );
}


function Description({ description }) {
  if (!description) {
    return null;
  }

  return (
    <div className="col-12 col-lg feed-desc">
      <p>{description}</p>
    </div>
  );
}

function Listing({
  icon,
  title,
  description,
}) {
  return (
    <div className="row mt-3 mb-3">
      <ListingIcon src={icon} alt={title} />
      <div className={icon ? 'col' : 'col-lg-8 offset-lg-2 col'}>
        <div className="row">
          <div className="col-12 col-lg-auto">
            <h2>{title}</h2>
          </div>
          <Description description={description} />
        </div>
      </div>
    </div>
  );
}

export default Listing;
