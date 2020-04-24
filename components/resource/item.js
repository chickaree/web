import Article from '../article';
import PageTitle from '../page-title';

function Item({
  resource: {
    title,
    url,
    description,
    icon,
    banner,
    sitename,
    datePublished,
  },
}) {
  const { origin } = new URL(url);

  return (
    <>
      <PageTitle parts={[title, sitename]} />
      <div className="container mt-3">
        <div className="row">
          <div className="col col-lg-8 offset-lg-2">
            <Article
              source={origin}
              title={title}
              url={url}
              description={description}
              icon={icon}
              banner={banner}
              sitename={sitename}
              datePublished={datePublished}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default Item;
