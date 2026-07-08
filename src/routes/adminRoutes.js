const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const {
  analytics,
  createRecipe,
  createIngredient,
  deleteRecipe,
  listIngredients,
  listRecipes,
  updateRecipe,
} = require('../controllers/adminController');

const router = express.Router();

router.get('/analytics', requireAuth, requireRole('ADMIN'), analytics);
router.get('/recipes', requireAuth, requireRole('ADMIN'), listRecipes);
router.get('/ingredients', requireAuth, requireRole('ADMIN'), listIngredients);
router.post('/ingredients', requireAuth, requireRole('ADMIN'), createIngredient);
router.post('/recipes', requireAuth, requireRole('ADMIN'), createRecipe);
router.put('/recipes/:id', requireAuth, requireRole('ADMIN'), updateRecipe);
router.delete('/recipes/:id', requireAuth, requireRole('ADMIN'), deleteRecipe);

module.exports = router;
