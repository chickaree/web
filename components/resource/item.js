import CardItem from '../card/item';

function Item({
  resource,
}) {
  return (
    <>
      <div className="container mt-3">
        <div className="row">
          <div className="col col-lg-8 offset-lg-2">
            <CardItem resource={resource} />
          </div>
        </div>
      </div>
    </>
  );
}

export default Item;
