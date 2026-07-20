const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

const databaseReady = pool.query(`
  CREATE TABLE IF NOT EXISTS recipe_cache (
    cache_key TEXT PRIMARY KEY,
    ingredients_json TEXT NOT NULL,
    notes TEXT NOT NULL,
    recipe_json TEXT NOT NULL,
    hit_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

async function query(text, parameters = []) {
  await databaseReady;
  return pool.query(text, parameters);
}

module.exports = {
  query,
};