const express = require('express');
const { createFavorite, getFavorites } = require('../controllers/favoriteRecipeController');

const router = express.Router();

router.get('/', getFavorites);
router.post('/', createFavorite);

module.exports = router;
