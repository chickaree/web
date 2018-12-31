const next = require('next');
const Hapi = require('hapi');
const {
  pathWrapper,
  defaultHandlerWrapper,
  nextHandlerWrapper,
} = require('./next-wrapper');

const dev = process.env.NODE_ENV !== 'production';
const port = 80;
const app = next({ dev });
const server = new Hapi.Server({
  port,
});

app.prepare().then(async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler: pathWrapper(app, '/index'),
  });

  server.route({
    method: 'GET',
    path: '/{host}/{path?}',
    handler: pathWrapper(app, '/query'),
  });

  server.route({
    method: 'GET',
    path: '/static/{p*}' /* next specific routes */,
    handler: nextHandlerWrapper(app),
  });

  server.route({
    method: 'GET',
    path: '/_next/{p*}' /* next specific routes */,
    handler: nextHandlerWrapper(app),
  });

  server.route({
    method: 'GET',
    path: '/{p*}' /* catch all route */,
    handler: defaultHandlerWrapper(app),
  });

  try {
    await server.start()
    console.log(`> Ready on http://localhost:${port}`)
  } catch (error) {
    console.log('Error starting server')
    console.log(error)
  }
})