const { recommendRecipes } = require('../services/recommendationService');

async function recommend(req, res, next) {
  try {
    const ingredients = req.body;
    const userId = String(req.header('x-user-id') || req.body?.userId || '').trim() || null;

    if (!Array.isArray(ingredients)) {
      return res.status(400).json({
        message: 'Request body must be an array of ingredient names.',
      });
    }

    const cleanedIngredients = ingredients.filter((value) => typeof value === 'string' && value.trim().length > 0);

    if (cleanedIngredients.length === 0) {
      return res.status(400).json({
        message: 'Please provide at least one valid ingredient.',
      });
    }

    const result = await recommendRecipes(cleanedIngredients, userId);

    return res.json({
      inputIngredients: cleanedIngredients,
      resolvedIngredients: result.resolvedIngredients,
      unresolvedIngredients: result.unresolvedIngredients,
      matchDetails: result.matchDetails,
      totalRecipes: result.recommendations.length,
      recommendations: result.recommendations,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  recommend,
};
