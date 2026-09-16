const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured');
}

const usesDatabaseSsl =
  process.env.DATABASE_SSL === 'true' || process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: usesDatabaseSsl ? { rejectUnauthorized: false } : false,
});

const databaseReady = (async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_recommendations (
      id BIGSERIAL PRIMARY KEY,
      ingredients_json TEXT NOT NULL,
      notes TEXT NOT NULL,
      recipes_json TEXT NOT NULL,
      recipe_details_json TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE menu_recommendations
    ADD COLUMN IF NOT EXISTS recipe_details_json TEXT NOT NULL DEFAULT '{}'
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS invalid_ingredients (
      id BIGSERIAL PRIMARY KEY,
      original_name TEXT NOT NULL,
      normalized_name TEXT NOT NULL UNIQUE,
      reason TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE invalid_ingredients
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  `);
})();

async function query(text, parameters = []) {
  await databaseReady;
  return pool.query(text, parameters);
}

module.exports = {
  query,
};
