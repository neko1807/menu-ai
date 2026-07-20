const crypto = require('crypto');
const database = require('../db/database');

const CACHE_VERSION = 'recipe-v1';

function normalizeText(value) {
    return String(value || '')
    .trim()
    .toLocaleLowerCase('th-TH')
    .replace(/\s+/g, ' ');
}

function normalizeIngredients(ingredients) {
    return [...new Set(
        ingredients
        .map(normalizeText)
        .filter(Boolean),
    )].sort();
}

function createCacheKey({ ingredients, notes }) {
    const normalizedData = {
        version: CACHE_VERSION,
        ingredients: normalizeIngredients(ingredients),
        notes: normalizeText(notes),
};

return crypto
    .createHash('sha256')
    .update(JSON.stringify(normalizedData))
    .digest('hex');
}

async function findCachedRecipe({ ingredients, notes }) {
  const cacheKey = createCacheKey({ ingredients, notes });

  const result = await database.query(
    `
      SELECT recipe_json
      FROM recipe_cache
      WHERE cache_key = $1
    `,
    [cacheKey],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  await database.query(
    `
      UPDATE recipe_cache
      SET hit_count = hit_count + 1,
          last_used_at = CURRENT_TIMESTAMP
      WHERE cache_key = $1
    `,
    [cacheKey],
  );

  try {
    return JSON.parse(row.recipe_json);
  } catch {
    return null;
  }
}

async function saveCachedRecipe({ ingredients, notes, recipe }) {
  const cacheKey = createCacheKey({ ingredients, notes });

  await database.query(
    `
      INSERT INTO recipe_cache (
        cache_key,
        ingredients_json,
        notes,
        recipe_json
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (cache_key) DO UPDATE SET
        recipe_json = EXCLUDED.recipe_json,
        last_used_at = CURRENT_TIMESTAMP
    `,
    [
      cacheKey,
      JSON.stringify(normalizeIngredients(ingredients)),
      normalizeText(notes),
      JSON.stringify(recipe),
    ],
  );
}

module.exports = {
    findCachedRecipe,
    saveCachedRecipe,
};