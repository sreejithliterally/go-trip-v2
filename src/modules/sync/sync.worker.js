/**
 * OTA Channel Sync Worker
 *
 * Polls sync_queue for pending/failed jobs and processes them.
 * Uses SELECT ... FOR UPDATE SKIP LOCKED to prevent duplicate processing.
 *
 * Schema: ota_channel_sync_schema.sql must be applied first.
 * This is a STUB implementation — actual channel adapters are next-phase.
 */

const { withTransaction } = require('../../db/pool');
const logger = require('../../shared/utils/logger');

const MAX_JOBS_PER_TICK = 10;
const POLL_INTERVAL_MS  = 30_000; // 30 seconds

let running = false;
let timer   = null;

const processTick = async () => {
  if (running) return;
  running = true;

  try {
    await withTransaction(async (client) => {
      // Claim jobs
      const { rows: jobs } = await client.query(
        `SELECT * FROM sync_queue
         WHERE status IN ('pending', 'failed')
           AND next_retry_at <= NOW()
         ORDER BY next_retry_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [MAX_JOBS_PER_TICK]
      );

      if (!jobs.length) return;

      logger.info(`Sync worker: processing ${jobs.length} job(s)`);

      for (const job of jobs) {
        await processJob(client, job);
      }
    });
  } catch (err) {
    logger.error('Sync worker tick error', { err });
  } finally {
    running = false;
  }
};

const processJob = async (client, job) => {
  const startedAt = new Date();
  let success = false;
  let errorMsg = null;

  try {
    // Mark as processing
    await client.query(
      `UPDATE sync_queue SET status='processing', updated_at=NOW() WHERE id=$1`,
      [job.id]
    );

    // TODO: Dispatch to channel adapter based on job.channel_id / job.operation
    // e.g. const adapter = getChannelAdapter(job.channel_type);
    //      await adapter.push(job.payload);
    logger.info('Sync job dispatched (stub)', { jobId: job.id, operation: job.operation });

    success = true;
    await client.query(
      `UPDATE sync_queue SET status='completed', completed_at=NOW(), updated_at=NOW() WHERE id=$1`,
      [job.id]
    );
  } catch (err) {
    errorMsg = err.message;
    const attempts   = (job.attempts || 0) + 1;
    const maxAttempts = job.max_attempts || 5;
    const backoffMs  = Math.pow(2, attempts) * 60 * 1000; // exponential, minutes
    const nextRetry  = new Date(Date.now() + backoffMs).toISOString();
    const newStatus  = attempts >= maxAttempts ? 'failed' : 'failed';

    await client.query(
      `UPDATE sync_queue SET status=$1, attempts=$2, next_retry_at=$3, updated_at=NOW() WHERE id=$4`,
      [newStatus, attempts, nextRetry, job.id]
    );
  }

  // Write to sync_logs regardless of outcome
  try {
    await client.query(
      `INSERT INTO sync_logs (sync_queue_id, success, error_message, started_at, completed_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT DO NOTHING`,
      [job.id, success, errorMsg, startedAt.toISOString()]
    );
  } catch {
    // Don't fail the outer job if logging fails
  }
};

const start = () => {
  logger.info('OTA sync worker started');
  timer = setInterval(processTick, POLL_INTERVAL_MS);
  // Run immediately on start
  processTick().catch(err => logger.error('Initial sync tick error', { err }));
};

const stop = () => {
  if (timer) { clearInterval(timer); timer = null; }
  logger.info('OTA sync worker stopped');
};

module.exports = { start, stop };
