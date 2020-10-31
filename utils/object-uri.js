import slugify from 'slugify';

function objectUri(text) {
  return `https://chickar.ee/object/${slugify(text, { lower: true })}`;
}

export default objectUri;
