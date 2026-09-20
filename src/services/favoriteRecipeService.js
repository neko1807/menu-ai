const database = require('../db/database');

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function parseRecipe(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toFavorite(row) {
  return {
    id: Number(row.id),
    recipe: parseRecipe(row.recipe_json),
    savedAt: row.saved_at,
  };
}

async function saveFavoriteRecipe({ userId, recipe }) {
  const title = cleanText(recipe?.title, 160);
  if (!title) {
    const error = new Error('ไม่พบชื่อเมนูที่ต้องการบันทึก');
    error.statusCode = 400;
    throw error;
  }

  const savedRecipe = {
    title,
    summary: cleanText(recipe?.summary, 500),
    estimatedCookingTime: Number.isInteger(Number(recipe?.estimatedCookingTime))
      ? Number(recipe.estimatedCookingTime)
      : null,
    difficulty: cleanText(recipe?.difficulty, 40),
    usedIngredients: Array.isArray(recipe?.usedIngredients) ? recipe.usedIngredients.slice(0, 30) : [],
    missingIngredients: Array.isArray(recipe?.missingIngredients) ? recipe.missingIngredients.slice(0, 30) : [],
    steps: Array.isArray(recipe?.steps) ? recipe.steps.slice(0, 20) : [],
    tips: Array.isArray(recipe?.tips) ? recipe.tips.slice(0, 10) : [],
  };

  const result = await database.query(
    `
      INSERT INTO favorite_recipes (user_id, title, recipe_json)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, title) DO UPDATE SET
        recipe_json = EXCLUDED.recipe_json,
        saved_at = CURRENT_TIMESTAMP
      RETURNING id, recipe_json, saved_at
    `,
    [userId, title, JSON.stringify(savedRecipe)],
  );

  return toFavorite(result.rows[0]);
}

async function listFavoriteRecipes(userId) {
  const result = await database.query(
    `
      SELECT id, recipe_json, saved_at
      FROM favorite_recipes
      WHERE user_id = $1
      ORDER BY saved_at DESC, id DESC
      LIMIT 30
    `,
    [userId],
  );

  return result.rows.map(toFavorite).filter((favorite) => favorite.recipe);
}

module.exports = { listFavoriteRecipes, saveFavoriteRecipe };
