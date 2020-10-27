import md5 from 'md5';

function hashUri(data) {
  return `https://chickar.ee/object/${md5(JSON.stringify(data))}`;
}

export default hashUri;
