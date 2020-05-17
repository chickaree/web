import { decode } from 'base64url';
import jsdom from 'jsdom';
import getResponseData from '../../../utils/response/data';

const { JSDOM } = jsdom;
const { Response } = fetch;

// Setup Globals
const { window } = new JSDOM('');
global.DOMParser = window.DOMParser;
global.HTMLDocument = window.HTMLDocument;
global.XMLDocument = window.XMLDocument;

const { length } = '/api/parse/';

async function parse(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('');
    return;
  }

  const [domain, hash] = req.url.substring(length).split('/');
  const url = new URL(hash ? decode(hash) : '', `https://${domain}/`);

  const response = new Response(req.body, {
    url: url.toString(),
    headers: {
      'Content-Type': req.headers['content-type'],
    },
  });

  res.json(await getResponseData(response));
}

export default parse;
