const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './index.js',
  mode: 'production',
  target: 'node',
  output: {
    libraryTarget: 'commonjs',
  },
  module: {
    rules: [
      {
        test: /\.jsonld$/,
        type: 'json',
      },
    ],
  },
  externals: [
    nodeExternals({
      whitelist: [
        /^schemaorg/,
      ],
    }),
  ],
};
