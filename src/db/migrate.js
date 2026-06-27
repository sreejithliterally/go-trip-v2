/**
 * Run all SQL migration files in order.
 * Usage: node src/db/migrate.js
 */
require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const { sequelize } = require('./pool');
const { QueryTypes } = require('sequelize');
const logger = require('../shared/utils/logger');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const run = async () => {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const applied = await sequelize.query(`SELECT filename FROM _migrations`, { type: QueryTypes.SELECT });
    const appliedSet = new Set(applied.map(r => r.filename));

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) {
        logger.info(`Skipping (already applied): ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      logger.info(`Applying migration: ${file}`);
      const t = await sequelize.transaction();
      try {
        await sequelize.query(sql, { transaction: t });
        await sequelize.query(`INSERT INTO _migrations (filename) VALUES (:file)`, {
          replacements: { file },
          transaction: t,
        });
        await t.commit();
        logger.info(`Applied: ${file}`);
      } catch (err) {
        await t.rollback();
        logger.error(`Failed: ${file}`, { err: err.message });
        throw err;
      }
    }

    logger.info('All migrations complete');
  } finally {
    await sequelize.close();
  }
};

run().catch(err => {
  logger.error('Migration error', { err });
  process.exit(1);
});
