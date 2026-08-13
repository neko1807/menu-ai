const database = require('../db/database');

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

async function saveMenuRecommendations({ ingredients, notes, recipes }) {
  const result = await database.query(
    `
      INSERT INTO menu_recommendations (
        ingredients_json,
        notes,
        recipes_json
      )
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    [
      JSON.stringify(normalizeIngredients(ingredients)),
      normalizeText(notes),
      JSON.stringify(recipes),
    ],
  );

  return result.rows[0].id;
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function findMenuRecommendations(id) {
  const result = await database.query(
    `
      SELECT ingredients_json, notes, recipes_json, recipe_details_json
      FROM menu_recommendations
      WHERE id = $1
    `,
    [id],
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    ingredients: parseJson(row.ingredients_json, []),
    notes: row.notes,
    recipes: parseJson(row.recipes_json, []),
    recipeDetails: parseJson(row.recipe_details_json, {}),
  };
}

async function saveMenuRecommendationDetail({ id, recipeDetails }) {
  await database.query(
    `
      UPDATE menu_recommendations
      SET recipe_details_json = $1
      WHERE id = $2
    `,
    [JSON.stringify(recipeDetails), id],
  );
}

module.exports = {
  findMenuRecommendations,
  saveMenuRecommendationDetail,
  saveMenuRecommendations,
};
