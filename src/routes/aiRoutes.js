const express = require('express');
const { createRecipeIdea } = require('../controllers/aiController');

const router = express.Router();

router.post('/recipe', createRecipeIdea);

module.exports = router;
