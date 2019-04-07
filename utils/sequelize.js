const Sequalize = require('sequelize');

const sequalize = new Sequalize({
  dialect: 'sqlite',
  storage: '/app/data/database.sqlite',
});

module.exports = sequalize;
