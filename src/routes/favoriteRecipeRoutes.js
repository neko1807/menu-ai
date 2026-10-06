const express = require('express');
const { createFavorite, getFavorites, removeFavorite } = require('../controllers/favoriteRecipeController');

const router = express.Router();

router.get('/', getFavorites);
router.post('/', createFavorite);
router.delete('/:id', removeFavorite);

module.exports = router;
