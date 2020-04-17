module.exports = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.jsonld$/,
      type: 'json',
    });
    return config;
  },
};
