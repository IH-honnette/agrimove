require('dotenv').config();
const pool = require('./db');

async function migrate() {
  await pool.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7)`);
  await pool.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7)`);
  await pool.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_address TEXT`);
  await pool.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP`);
  console.log('Migration done');
  process.exit(0);
}
migrate().catch(e => { console.error(e); process.exit(1); });
