const prisma = require('../config/prisma');
const {
  createIngredientMatcher,
  normalizeSearchTerm,
  resolveIngredientInputs,
} = require('../utils/ingredientMatcher');

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getCookingTimeScore(cookingTime, minCookingTime, maxCookingTime) {
  if (!Number.isFinite(cookingTime)) return 0;
  if (maxCookingTime <= minCookingTime) return 1;

  const normalized = 1 - (cookingTime - minCookingTime) / (maxCookingTime - minCookingTime);
  return clamp(normalized * 0.9 + 0.1);
}

function buildRankingReasons({
  matchedCount,
  recipeIngredientCount,
  unresolvedCount,
  ingredientCoverage,
  inputCoverage,
  matchConfidence,
  cookingTime,
}) {
  const reasons = [];

  if (matchedCount === recipeIngredientCount && recipeIngredientCount > 0) {
    reasons.push('ตรงกับวัตถุดิบทั้งหมด');
  } else if (matchedCount > 0) {
    reasons.push(`ตรง ${matchedCount}/${recipeIngredientCount} วัตถุดิบ`);
  }

  if (inputCoverage >= 0.75) {
    reasons.push('จับคู่กับวัตถุดิบที่พิมพ์มาได้ค่อนข้างครบ');
  }

  if (matchConfidence < 1) {
    reasons.push('รองรับคำพิมพ์ใกล้เคียงหรือคำเรียกอื่น');
  }

  if (cookingTime <= 15) {
    reasons.push('ทำได้เร็ว');
  } else if (cookingTime <= 25) {
    reasons.push('ใช้เวลาไม่มาก');
  }

  if (unresolvedCount > 0) {
    reasons.push(`ยังไม่รู้จัก ${unresolvedCount} คำ`);
  }

  if (ingredientCoverage >= 1) {
    reasons.push('วัตถุดิบในตู้เข้ากันพอดี');
  }

  if (!reasons.length) {
    reasons.push('เป็นตัวเลือกสำรองที่ยังสมเหตุผล');
  }

  return reasons.slice(0, 4);
}

async function recommendRecipes(inputIngredients, userId) {
  const [ingredients, recipes] = await Promise.all([
    prisma.ingredient.findMany({
      include: {
        aliases: {
          select: {
            alias: true,
            normalizedAlias: true,
          },
        },
      },
    }),
    prisma.recipe.findMany({
      include: {
        recipeIngredients: {
          include: {
            ingredient: true,
          },
        },
      },
    }),
  ]);

  const cookingTimes = recipes.map((recipe) => recipe.cookingTime).filter((value) => Number.isFinite(value));
  const minCookingTime = cookingTimes.length ? Math.min(...cookingTimes) : 0;
  const maxCookingTime = cookingTimes.length ? Math.max(...cookingTimes) : 0;

  const matcher = createIngredientMatcher(ingredients);
  const { resolvedIngredients, unresolvedIngredients, matchDetails } = resolveIngredientInputs(
    inputIngredients,
    matcher,
  );
  const resolvedIngredientIds = new Set(resolvedIngredients.map((ingredient) => ingredient.id));
  const resolvedConfidenceByIngredientId = new Map();

  for (const match of matchDetails) {
    const currentScore = resolvedConfidenceByIngredientId.get(match.ingredientId) || 0;
    if (match.score > currentScore) {
      resolvedConfidenceByIngredientId.set(match.ingredientId, match.score);
    }
  }

  const recommendations = recipes
    .map((recipe) => {
      const recipeIngredientCount = recipe.recipeIngredients.length;
      const matchedRecipeIngredients = recipe.recipeIngredients.filter((item) =>
        resolvedIngredientIds.has(item.ingredient.id),
      );
      const missingRecipeIngredients = recipe.recipeIngredients.filter(
        (item) => !resolvedIngredientIds.has(item.ingredient.id),
      );

      const matchedIngredients = [...new Set(matchedRecipeIngredients.map((item) => item.ingredient.name))];
      const missingIngredients = [...new Set(missingRecipeIngredients.map((item) => item.ingredient.name))];
      const matchedCount = matchedRecipeIngredients.length;
      if (!matchedCount) {
        return null;
      }

      const matchedIngredientIds = matchedRecipeIngredients.map((item) => item.ingredient.id);
      const ingredientCoverage = recipeIngredientCount ? matchedCount / recipeIngredientCount : 0;
      const inputCoverage = resolvedIngredients.length ? matchedCount / resolvedIngredients.length : 0;
      const matchConfidence = matchedIngredientIds.length
        ? average(
            matchedIngredientIds.map((ingredientId) => resolvedConfidenceByIngredientId.get(ingredientId) || 0.78),
          )
        : 0;
      const cookingTimeScore = getCookingTimeScore(recipe.cookingTime, minCookingTime, maxCookingTime);

      const exactnessScore = matchedCount
        ? clamp((ingredientCoverage * 0.65) + (inputCoverage * 0.35))
        : 0;

      const hybridScore = clamp(
        exactnessScore * 0.55 +
          matchConfidence * 0.15 +
          cookingTimeScore * 0.3,
      );

      const rankingReasons = buildRankingReasons({
        matchedCount,
        recipeIngredientCount,
        unresolvedCount: unresolvedIngredients.length,
        ingredientCoverage,
        inputCoverage,
        matchConfidence,
        cookingTime: recipe.cookingTime,
      });

      return {
        id: recipe.id,
        title: recipe.title,
        instruction: recipe.instruction,
        cookingTime: recipe.cookingTime,
        type: recipe.type,
        ingredients: recipe.recipeIngredients.map((item) => ({
          id: item.ingredient.id,
          name: item.ingredient.name,
          quantity: item.quantity.toString(),
          unit: item.unit,
        })),
        matchedIngredients,
        missingIngredients,
        matchedCount,
        similarityScore: Number(hybridScore.toFixed(4)),
        recommendationScore: Number(hybridScore.toFixed(4)),
        matchConfidence: Number(matchConfidence.toFixed(4)),
        ingredientCoverage: Number(ingredientCoverage.toFixed(4)),
        inputCoverage: Number(inputCoverage.toFixed(4)),
        cookingTimeScore: Number(cookingTimeScore.toFixed(4)),
        rankingReasons,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.recommendationScore !== left.recommendationScore) {
        return right.recommendationScore - left.recommendationScore;
      }

      if (right.matchedCount !== left.matchedCount) {
        return right.matchedCount - left.matchedCount;
      }

      if (right.matchConfidence !== left.matchConfidence) {
        return right.matchConfidence - left.matchConfidence;
      }

      if (left.cookingTime !== right.cookingTime) {
        return left.cookingTime - right.cookingTime;
      }

      return left.title.localeCompare(right.title);
    });

  if (userId) {
    const uniqueInputIngredients = [];
    const seen = new Set();

    for (const ingredient of inputIngredients) {
      const normalizedIngredient = normalizeSearchTerm(ingredient);

      if (!normalizedIngredient || seen.has(normalizedIngredient)) {
        continue;
      }

      seen.add(normalizedIngredient);
      uniqueInputIngredients.push(String(ingredient).trim());
    }

    if (uniqueInputIngredients.length) {
      await prisma.searchHistory.createMany({
        data: uniqueInputIngredients.map((ingredientName) => ({
          userId,
          searchedIngredient: ingredientName,
        })),
      });
    }
  }

  return {
    resolvedIngredients,
    unresolvedIngredients,
    matchDetails,
    recommendations,
  };
}

module.exports = {
  recommendRecipes,
};
