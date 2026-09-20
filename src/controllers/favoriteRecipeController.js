const { listFavoriteRecipes, saveFavoriteRecipe } = require('../services/favoriteRecipeService');

async function createFavorite(req, res, next) {
  try {
    const favorite = await saveFavoriteRecipe({
      userId: req.auth.userId,
      recipe: req.body?.recipe,
    });

    return res.status(201).json({ favorite });
  } catch (error) {
    if (Number.isInteger(error?.statusCode)) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return next(error);
  }
}

async function getFavorites(req, res, next) {
  try {
    const favorites = await listFavoriteRecipes(req.auth.userId);
    return res.json({ favorites });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createFavorite, getFavorites };
