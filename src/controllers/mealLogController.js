const { createMealLog, listMealLogs } = require('../services/mealLogService');

async function createMeal(req, res, next) {
  try {
    const meal = await createMealLog({
      userId: req.auth.userId,
      title: req.body?.title,
      summary: req.body?.summary,
      cookingTime: req.body?.cookingTime,
    });

    return res.status(201).json({ meal });
  } catch (error) {
    if (Number.isInteger(error?.statusCode)) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return next(error);
  }
}

async function getMeals(req, res, next) {
  try {
    const meals = await listMealLogs(req.auth.userId);
    return res.json({ meals });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createMeal, getMeals };
