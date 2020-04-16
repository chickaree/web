function Icon({ src, alt }) {
  if (!src) {
    return null;
  }

  return (
    <div className="border rounded p-1">
      <div className="embed-responsive embed-responsive-1by1">
        <img src={src} alt={alt} className="embed-responsive-item" loading="lazy" />
      </div>
    </div>
  );
}

export default Icon;
