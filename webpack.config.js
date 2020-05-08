const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './index.js',
  mode: 'production',
  target: 'node',
  module: {
    rules: [
      {
        test: /\.jsonld$/,
        type: 'json',
      }
    ]
  },
  externals: [
    nodeExternals({
      whitelist: [
        /^schemaorg/,
      ],
    }),
  ],
};
