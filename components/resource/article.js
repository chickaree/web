import Article from '../article';

function ResourceArticle({
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
    <div className="container mt-3">
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
  );
}

export default ResourceArticle;
