const { generateRecipeDetails, generateRecipeIdea } = require('../services/aiRecipeService');
const {
  findMenuRecommendations,
  saveMenuRecommendationDetail,
  saveMenuRecommendations,
} = require('../services/recipeCacheService');

async function createRecipeIdea(req, res, next) {
  try {
    const ingredients = Array.isArray(req.body?.ingredients)
      ? req.body.ingredients
      : [];

    const notes = String(req.body?.notes || '').trim();

    const recipeRecommendations = await generateRecipeIdea({
      ingredients,
      notes,
    });

    const recommendationId = await saveMenuRecommendations({
      ingredients,
      notes,
      recipes: recipeRecommendations.recipes,
    });

    return res.json({
      recommendationId,
      recipeIdeas: recipeRecommendations.recipes,
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

async function createRecipeDetails(req, res, next) {
  try {
    const recommendationId = Number(req.body?.recommendationId);
    const recipeIndex = Number(req.body?.recipeIndex);

    if (!Number.isInteger(recommendationId) || !Number.isInteger(recipeIndex) || recipeIndex < 0 || recipeIndex > 4) {
      return res.status(400).json({ message: 'ข้อมูลเมนูที่เลือกไม่ถูกต้อง' });
    }

    const recommendations = await findMenuRecommendations(recommendationId);
    if (!recommendations || !Array.isArray(recommendations.recipes) || !recommendations.recipes[recipeIndex]) {
      return res.status(404).json({ message: 'ไม่พบชุดเมนูที่เลือก' });
    }

    const savedRecipe = recommendations.recipeDetails[recipeIndex];
    if (savedRecipe) {
      return res.json({ recipeIdea: savedRecipe, cached: true });
    }

    const recipeIdea = await generateRecipeDetails({
      ingredients: recommendations.ingredients,
      notes: recommendations.notes,
      selectedRecipe: recommendations.recipes[recipeIndex],
    });

    await saveMenuRecommendationDetail({
      id: recommendationId,
      recipeDetails: { ...recommendations.recipeDetails, [recipeIndex]: recipeIdea },
    });

    return res.json({ recipeIdea, cached: false });
  } catch (error) {
    if (Number.isInteger(error?.statusCode)) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return next(error);
  }
}

module.exports = {
  createRecipeDetails,
  createRecipeIdea,
};
