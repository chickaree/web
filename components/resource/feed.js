import Listing from '../listing';

function Feed({
  resource: {
    title,
    description,
    icon,
  },
}) {
  return (
    <div className="container">
      <Listing title={title} description={description} icon={icon} />
    </div>
  );
}

export default Feed;
