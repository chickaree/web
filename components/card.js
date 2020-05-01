function Card({ children }) {
  return (
    <div className="row mb-3">
      <div className="col feed-item">
        <div className="card">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Card;
