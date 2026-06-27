require('dotenv').config();

const { Sequelize } = require('sequelize');
const pg = require('pg');

// Parse NUMERIC / DECIMAL columns as JS floats instead of strings
pg.types.setTypeParser(1700, parseFloat);
// Parse INT8 / BIGINT as numbers
pg.types.setTypeParser(20, parseInt);

const isRDS = (process.env.DB_HOST || '').includes('.rds.amazonaws.com');

const sequelize = new Sequelize({
  dialect:  'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'gotripv2',
  username: process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  logging:  false,
  pool: {
    min:     parseInt(process.env.DB_POOL_MIN || '2'),
    max:     parseInt(process.env.DB_POOL_MAX || '10'),
    idle:    30000,
    acquire: 10000,
  },
  dialectOptions: isRDS ? {
    ssl: { require: true, rejectUnauthorized: false },
  } : {},
  define: {
    underscored: true,
    freezeTableName: true,
  },
});

module.exports = sequelize;
