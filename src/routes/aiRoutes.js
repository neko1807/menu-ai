const express = require('express');
const { createRecipeDetails, createRecipeIdea } = require('../controllers/aiController');

const router = express.Router();

router.post('/recipe', createRecipeIdea);
router.post('/recipe-details', createRecipeDetails);

module.exports = router;
