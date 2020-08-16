const { InjectManifest } = require('workbox-webpack-plugin');
const { join } = require('path');

module.exports = {
  env: {
    // Pass dev mode to the client.
    DEV: process.env.NODE_ENV !== 'production',
  },
  webpack: (config, { isServer, dev }) => {
    config.module.rules.push({
      test: /\.jsonld$/,
      type: 'json',
    });

    if (!isServer && !dev) {
      config.plugins.push(new InjectManifest({
        swSrc: join(__dirname, 'sw.js'),
        swDest: join(__dirname, 'public', 'sw.js'),
        exclude: [
          'react-loadable-manifest.json',
          'build-manifest.json',
          /\.map$/,
        ],
        modifyURLPrefix: {
          'static/': '_next/static/',
        },
      }));
    }
    return config;
  },
};
