import Article from '../article';

function ResourceArticle({
  resource: {
    title,
    url,
    description,
    icon,
    banner,
    sitename,
  },
}) {
  const { origin } = new URL(url);

  return (
    <Article
      origin={origin}
      title={title}
      url={url}
      description={description}
      icon={icon}
      banner={banner}
      sitename={sitename}
    />
  );
}

export default ResourceArticle;
