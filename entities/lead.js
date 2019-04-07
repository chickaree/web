const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');

const Lead = sequelize.define('lead', {
  email: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  website: {
    type: Sequelize.STRING,
    allowNull: true,
  },
}, {
  underscored: true,
  timestamps: true,
  createdAt: 'created',
  updatedAt: false,
  freezeTableName: true,
});

module.exports = Lead;
