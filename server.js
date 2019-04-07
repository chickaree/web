const next = require('next');
const Hapi = require('hapi');
const Joi = require('@hapi/joi');
const sequelize = require('./utils/sequelize');
const {
  pathWrapper,
  defaultHandlerWrapper,
  nextHandlerWrapper,
} = require('./next-wrapper');
const Lead = require('./entities/lead');

const dev = process.env.NODE_ENV !== 'production';
const port = 80;
const app = next({ dev });
const server = new Hapi.Server({
  port,
});

// Create the database tables if they don't exist already.
sequelize.sync();

app.prepare().then(async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler: pathWrapper(app, '/index'),
  });

  server.route({
    method: 'GET',
    path: '/api/lead',
    handler: async () => {
      const count = await Lead.count({
        distinct: true,
        col: 'email',
      });

      return {
        count,
      };
    },
  });

  server.route({
    method: 'POST',
    path: '/api/lead',
    handler: async (request, h) => {
      await Lead.create({
        email: request.payload.email,
        website: request.payload.website || null,
      });

      return h.response().code(201);
    },
    options: {
      auth: false,
      validate: {
        payload: {
          email: Joi.string().email().required(),
          website: Joi.string().uri(),
        },
      },
    },
  });

  // server.route({
  //   method: 'GET',
  //   path: '/{host}/{path?}',
  //   handler: pathWrapper(app, '/query'),
  // });

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
