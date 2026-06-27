#!/usr/bin/env node
/**
 * Seed amenity_master with standard amenities.
 * Usage: node src/db/seed-amenities.js
 */
require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const { Client } = require('pg');

const sql = fs.readFileSync(
  path.join(__dirname, 'migrations/004_seed_amenities.sql'),
  'utf8'
);

const client = new Client({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_HOST?.includes('.rds.amazonaws.com')
    ? { rejectUnauthorized: false }
    : false,
});

(async () => {
  await client.connect();
  await client.query(sql);

  const { rows } = await client.query(`
    SELECT id, name, icon_slug, category
    FROM amenity_master
    WHERE is_active = true
    ORDER BY category, name
  `);

  console.log(`\nAmenities seeded — ${rows.length} active:\n`);
  for (const a of rows) {
    console.log(`  ${a.id}  ${a.name} (${a.category})`);
  }
  console.log('');

  await client.end();
})().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
