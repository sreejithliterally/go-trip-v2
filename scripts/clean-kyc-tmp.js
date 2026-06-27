#!/usr/bin/env node
/**
 * One-time script: removes KYC doc entries whose URL points to /tmp
 * (uploaded before S3 was active).
 *
 * Usage: node scripts/clean-kyc-tmp.js
 */
require('dotenv').config();
const { sequelize } = require('../src/db/index');

(async () => {
  await sequelize.authenticate();
  console.log('Connected. Cleaning up /tmp KYC entries...');

  const [results] = await sequelize.query(`
    UPDATE vendor_profiles
    SET kyc_docs_json = (
      SELECT jsonb_agg(elem ORDER BY (elem->>'uploaded_at'))
      FROM jsonb_array_elements(kyc_docs_json) AS elem
      WHERE elem->>'url' NOT LIKE '/tmp/%'
    )
    WHERE kyc_docs_json IS NOT NULL
      AND kyc_docs_json::text LIKE '%/tmp/%'
    RETURNING id, kyc_docs_json;
  `);

  if (!results.length) {
    console.log('No rows needed cleaning.');
  } else {
    results.forEach(r => {
      console.log(`\nVendor profile ${r.id} — remaining docs:`);
      (r.kyc_docs_json || []).forEach(d => console.log('  ', d.url));
    });
  }

  await sequelize.close();
  console.log('\nDone.');
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
