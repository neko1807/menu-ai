const { generateRecipeIdea } = require('../services/aiRecipeService');

async function createRecipeIdea(req, res, next) {
  try {
    const ingredients = Array.isArray(req.body?.ingredients) ? req.body.ingredients : [];
    const notes = String(req.body?.notes || '').trim();

    const result = await generateRecipeIdea({ ingredients, notes });

    return res.json({
      recipeIdea: result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createRecipeIdea,
};
