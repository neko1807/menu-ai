const { generateRecipeIdea } = require('../services/aiRecipeService');

async function createRecipeIdea(req, res, next) {
  try {
    const ingredients = Array.isArray(req.body?.ingredients) ? req.body.ingredients : [];
    const notes = String(req.body?.notes || '').trim();

    const recipeIdea = await generateRecipeIdea({
      ingredients,
      notes,
    });

    return res.json({ recipeIdea });
  } catch (error) {
    if (Number.isInteger(error?.statusCode)) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return next(error);
  }
}

module.exports = {
  createRecipeIdea,
};
