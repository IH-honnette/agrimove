require('dotenv').config();
const { Pool } = require('pg');

// Replace deprecated sslmode aliases with verify-full to silence pg v9 migration warning
const connectionString = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace(/sslmode=(prefer|require|verify-ca)(&|$)/g, 'sslmode=verify-full$2')
  : undefined;

const pool = new Pool({
  connectionString,
  ssl: connectionString ? { rejectUnauthorized: true } : false,
});

module.exports = pool;
