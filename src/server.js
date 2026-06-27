require('dotenv').config();

const app    = require('./app');
const { sequelize } = require('./db/index');  // loads all models + associations
const logger = require('./shared/utils/logger');
const syncWorker = require('./modules/sync/sync.worker');

const PORT = parseInt(process.env.PORT || '3000', 10);

const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established (Sequelize)');
  } catch (err) {
    logger.error('Database connection failed', { err });
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    logger.info(`GoTrip API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  // Start OTA sync worker only if sync_queue table exists
  try {
    await sequelize.query(`SELECT 1 FROM sync_queue LIMIT 0`);
    syncWorker.start();
  } catch {
    logger.info('OTA sync_queue not found — worker skipped (apply ota_channel_sync_schema.sql to enable)');
  }

  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down`);
    syncWorker.stop();
    server.close(async () => {
      await sequelize.close();
      logger.info('Server and DB pool closed');
      process.exit(0);
    });
    setTimeout(() => { logger.error('Forced exit'); process.exit(1); }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
};

start();
