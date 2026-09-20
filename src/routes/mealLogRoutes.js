const express = require('express');
const { createMeal, getMeals } = require('../controllers/mealLogController');

const router = express.Router();

router.get('/', getMeals);
router.post('/', createMeal);

module.exports = router;
