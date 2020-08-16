const { InjectManifest } = require('workbox-webpack-plugin');
const { join } = require('path');
const CopyPlugin = require('copy-webpack-plugin');

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
      // Copy the public files so they are picked up by the manifest.
      config.plugins.push(new CopyPlugin({
        patterns: [
          {
            from: 'public',
            to: 'public',
          },
        ],
      }));

      config.plugins.push(new InjectManifest({
        swSrc: join(__dirname, 'sw.js'),
        swDest: join(__dirname, 'public', 'sw.js'),
        exclude: [
          'react-loadable-manifest.json',
          'build-manifest.json',
          'public/sw.js',
          /\.map$/,
        ],
        modifyURLPrefix: {
          'static/': '_next/static/',
          'public/': '/',
        },
      }));
    }

    return config;
  },
};
