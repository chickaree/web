const withSass = require('@zeit/next-sass');
const withCSS = require('@zeit/next-css');

module.exports = withCSS(withSass({
  useFileSystemPublicRoutes: false,
  exportPathMap: () => ({
    '/': { page: '/' }
  }),
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(png|svg|eot|otf|ttf|woff|woff2)$/,
      use: {
        loader: 'url-loader',
        options: {
          limit: 100000,
          publicPath: './',
          outputPath: 'static/',
          name: '[name].[ext]',
        },
      },
    });

    return config;
  },
}));
