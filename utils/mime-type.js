const { defaultIfEmpty } = require("rxjs/operators");

const CONTENT_TYPE = 'Content-Type';

function getMimeType(response) {
  if (!response.headers.has(CONTENT_TYPE)) {
    return '';
  }


  return response.headers.get(CONTENT_TYPE).split(';').shift().trim();
}

export default getMimeType;
