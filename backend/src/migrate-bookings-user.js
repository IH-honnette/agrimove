require('dotenv').config();
const pool = require('./db');

async function migrate() {
  await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  console.log('Migration done');
  process.exit(0);
}
migrate().catch(e => { console.error(e); process.exit(1); });
