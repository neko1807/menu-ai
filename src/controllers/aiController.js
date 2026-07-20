const { generateRecipeIdea } = require('../services/aiRecipeService');
const {
  findCachedRecipe,
  saveCachedRecipe,
} = require('../services/recipeCacheService');

async function createRecipeIdea(req, res, next) {
  try {
    const ingredients = Array.isArray(req.body?.ingredients)
      ? req.body.ingredients
      : [];

    const notes = String(req.body?.notes || '').trim();

    const cachedRecipe = await findCachedRecipe({
      ingredients,
      notes,
    });

    if (cachedRecipe) {
      return res.json({
        recipeIdea: cachedRecipe,
        cached: true,
      });
    }

    const recipeIdea = await generateRecipeIdea({
      ingredients,
      notes,
    });

    await saveCachedRecipe({
      ingredients,
      notes,
      recipe: recipeIdea,
    });

    return res.json({
      recipeIdea,
      cached: false,
    });
  } catch (error) {
    if (Number.isInteger(error?.statusCode)) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    return next(error);
  }
}

module.exports = {
  createRecipeIdea,
};