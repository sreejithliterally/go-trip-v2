/**
 * Thin wrapper that exposes the Sequelize instance for raw SQL execution.
 * Use sequelize.query() for complex CTEs/views that are not expressed as ORM.
 * Use models from src/db/index.js for all standard CRUD.
 */
const sequelize      = require('./connection');
const { QueryTypes } = require('sequelize');

/**
 * Execute a raw SQL query.
 * @param {string} sql
 * @param {object} [options]  Sequelize query options (replacements, type, etc.)
 */
const rawQuery = (sql, options = {}) =>
  sequelize.query(sql, { type: QueryTypes.SELECT, ...options });

/**
 * Run work inside a Sequelize managed transaction.
 * fn receives the transaction object — pass it as { transaction: t } to every model call.
 */
const withTransaction = (fn) =>
  sequelize.transaction(fn);

module.exports = { sequelize, QueryTypes, rawQuery, withTransaction };
