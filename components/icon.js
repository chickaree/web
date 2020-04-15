function Icon({ src, alt }) {
  if (!src) {
    return null;
  }

  return (
    <div className="embed-responsive embed-responsive-1by1">
      <div className="embed-responsive-item border rounded p-1">
        <div className="row align-items-center h-100">
          <div className="col">
            <img src={src} alt={alt} className="w-100" loading="lazy" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Icon;
