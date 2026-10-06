const { deleteFavoriteRecipe, listFavoriteRecipes, saveFavoriteRecipe } = require('../services/favoriteRecipeService');

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

async function removeFavorite(req, res, next) {
  const favoriteId = Number(req.params.id);
  if (!Number.isSafeInteger(favoriteId) || favoriteId < 1) {
    return res.status(400).json({ message: 'รหัสเมนูโปรดไม่ถูกต้อง' });
  }

  try {
    const deleted = await deleteFavoriteRecipe(req.auth.userId, favoriteId);
    if (!deleted) {
      return res.status(404).json({ message: 'ไม่พบเมนูโปรดที่ต้องการลบ' });
    }

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}

module.exports = { createFavorite, getFavorites, removeFavorite };
