const prisma = require('../config/prisma');
const { createIngredientMatcher, getBestIngredientMatch, normalizeSearchTerm } = require('../utils/ingredientMatcher');
const { normalizeIngredientName } = require('../utils/normalizeIngredients');

function normalizeLabel(value) {
  return String(value ?? '').trim();
}

function parseRecipePayload(body) {
  const title = String(body?.title || '').trim();
  const instruction = String(body?.instruction || '').trim();
  const cookingTime = Number.parseInt(body?.cookingTime, 10);
  const type = String(body?.type || '').trim();
  const ingredients = Array.isArray(body?.ingredients) ? body.ingredients : [];

  return {
    title,
    instruction,
    cookingTime,
    type,
    ingredients: ingredients
      .map((item) => ({
        ingredientId: String(item?.ingredientId || '').trim(),
        quantity: Number(item?.quantity),
        unit: String(item?.unit || '').trim(),
      }))
      .filter((item) => item.ingredientId && item.unit && Number.isFinite(item.quantity) && item.quantity > 0),
  };
}

async function listRecipes(req, res, next) {
  try {
    const recipes = await prisma.recipe.findMany({
      orderBy: {
        title: 'asc',
      },
      include: {
        recipeIngredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return res.json({
      recipes: recipes.map((recipe) => ({
        id: recipe.id,
        title: recipe.title,
        instruction: recipe.instruction,
        cookingTime: recipe.cookingTime,
        type: recipe.type,
        ingredients: recipe.recipeIngredients.map((item) => ({
          ingredientId: item.ingredient.id,
          ingredientName: item.ingredient.name,
          quantity: Number(item.quantity),
          unit: item.unit,
        })),
      })),
    });
  } catch (error) {
    return next(error);
  }
}

async function listIngredients(req, res, next) {
  try {
    const ingredients = await prisma.ingredient.findMany({
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
      },
    });

    return res.json({ ingredients });
  } catch (error) {
    return next(error);
  }
}

async function createIngredient(req, res, next) {
  try {
    const name = normalizeIngredientName(req.body?.name);

    if (!name) {
      return res.status(400).json({ message: 'Ingredient name is required.' });
    }

    const existingIngredient = await prisma.ingredient.findFirst({
      where: {
        name,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (existingIngredient) {
      return res.status(409).json({ message: 'Ingredient already exists.' });
    }

    const ingredient = await prisma.ingredient.create({
      data: { name },
      select: {
        id: true,
        name: true,
      },
    });

    return res.status(201).json({ ingredient });
  } catch (error) {
    return next(error);
  }
}

async function createRecipe(req, res, next) {
  try {
    const payload = parseRecipePayload(req.body);

    if (!payload.title || !payload.instruction || !payload.type || !Number.isFinite(payload.cookingTime)) {
      return res.status(400).json({ message: 'Title, instruction, cooking time, and type are required.' });
    }

    if (!['HEALTHY', 'VEGETARIAN', 'GENERAL'].includes(payload.type)) {
      return res.status(400).json({ message: 'Invalid recipe type.' });
    }

    if (!payload.ingredients.length) {
      return res.status(400).json({ message: 'At least one ingredient is required.' });
    }

    const ingredientIds = payload.ingredients.map((item) => item.ingredientId);
    if (new Set(ingredientIds).size !== ingredientIds.length) {
      return res.status(400).json({ message: 'Duplicate ingredients are not allowed.' });
    }

    const foundIngredients = await prisma.ingredient.findMany({
      where: {
        id: {
          in: ingredientIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (foundIngredients.length !== ingredientIds.length) {
      return res.status(400).json({ message: 'One or more ingredients do not exist.' });
    }

    const recipe = await prisma.recipe.create({
      data: {
        title: payload.title,
        instruction: payload.instruction,
        cookingTime: payload.cookingTime,
        type: payload.type,
        recipeIngredients: {
          create: payload.ingredients.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
          })),
        },
      },
      include: {
        recipeIngredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    return res.status(201).json({
      recipe: {
        id: recipe.id,
        title: recipe.title,
        instruction: recipe.instruction,
        cookingTime: recipe.cookingTime,
        type: recipe.type,
        ingredients: recipe.recipeIngredients.map((item) => ({
          ingredientId: item.ingredient.id,
          ingredientName: item.ingredient.name,
          quantity: Number(item.quantity),
          unit: item.unit,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function updateRecipe(req, res, next) {
  try {
    const { id } = req.params;
    const payload = parseRecipePayload(req.body);

    if (!payload.title || !payload.instruction || !payload.type || !Number.isFinite(payload.cookingTime)) {
      return res.status(400).json({ message: 'Title, instruction, cooking time, and type are required.' });
    }

    if (!['HEALTHY', 'VEGETARIAN', 'GENERAL'].includes(payload.type)) {
      return res.status(400).json({ message: 'Invalid recipe type.' });
    }

    if (!payload.ingredients.length) {
      return res.status(400).json({ message: 'At least one ingredient is required.' });
    }

    const ingredientIds = payload.ingredients.map((item) => item.ingredientId);
    if (new Set(ingredientIds).size !== ingredientIds.length) {
      return res.status(400).json({ message: 'Duplicate ingredients are not allowed.' });
    }

    const foundIngredients = await prisma.ingredient.findMany({
      where: {
        id: {
          in: ingredientIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (foundIngredients.length !== ingredientIds.length) {
      return res.status(400).json({ message: 'One or more ingredients do not exist.' });
    }

    const existingRecipe = await prisma.recipe.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingRecipe) {
      return res.status(404).json({ message: 'Recipe not found.' });
    }

    const recipe = await prisma.$transaction(async (transaction) => {
      await transaction.recipe.update({
        where: { id },
        data: {
          title: payload.title,
          instruction: payload.instruction,
          cookingTime: payload.cookingTime,
          type: payload.type,
        },
      });

      await transaction.recipeIngredient.deleteMany({
        where: { recipeId: id },
      });

      await transaction.recipeIngredient.createMany({
        data: payload.ingredients.map((item) => ({
          recipeId: id,
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          unit: item.unit,
        })),
      });

      return transaction.recipe.findUnique({
        where: { id },
        include: {
          recipeIngredients: {
            include: {
              ingredient: true,
            },
          },
        },
      });
    });

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found.' });
    }

    return res.json({
      recipe: {
        id: recipe.id,
        title: recipe.title,
        instruction: recipe.instruction,
        cookingTime: recipe.cookingTime,
        type: recipe.type,
        ingredients: recipe.recipeIngredients.map((item) => ({
          ingredientId: item.ingredient.id,
          ingredientName: item.ingredient.name,
          quantity: Number(item.quantity),
          unit: item.unit,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteRecipe(req, res, next) {
  try {
    const { id } = req.params;

    const existingRecipe = await prisma.recipe.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingRecipe) {
      return res.status(404).json({ message: 'Recipe not found.' });
    }

    await prisma.recipe.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function analytics(req, res, next) {
  try {
    const [
      userCount,
      searchCount,
      recipeCount,
      ingredientCount,
      aliasCount,
      averageCookingStats,
      recipeTypeCounts,
      topIngredients,
      searchedTerms,
      ingredients,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.searchHistory.count(),
      prisma.recipe.count(),
      prisma.ingredient.count(),
      prisma.ingredientAlias.count(),
      prisma.recipe.aggregate({
        _avg: {
          cookingTime: true,
        },
      }),
      prisma.recipe.groupBy({
        by: ['type'],
        _count: {
          type: true,
        },
      }),
      prisma.searchHistory.groupBy({
        by: ['searchedIngredient'],
        _count: {
          searchedIngredient: true,
        },
        orderBy: {
          _count: {
            searchedIngredient: 'desc',
          },
        },
        take: 5,
      }),
      prisma.searchHistory.groupBy({
        by: ['searchedIngredient'],
        _count: {
          searchedIngredient: true,
        },
        orderBy: {
          _count: {
            searchedIngredient: 'desc',
          },
        },
        take: 50,
      }),
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
    ]);

    const matcher = createIngredientMatcher(ingredients);
    const recipeTypeMap = new Map(recipeTypeCounts.map((row) => [row.type, row._count.type]));
    const recipeTypes = ['GENERAL', 'HEALTHY', 'VEGETARIAN'].map((type) => ({
      type,
      count: recipeTypeMap.get(type) || 0,
    }));
    const unmatchedSearchTerms = searchedTerms
      .map((term) => {
        const bestMatch = getBestIngredientMatch(term.searchedIngredient, matcher);
        if (!bestMatch) {
          return {
            name: normalizeLabel(term.searchedIngredient),
            count: term._count.searchedIngredient,
          };
        }

        const normalizedTerm = normalizeSearchTerm(term.searchedIngredient);
        if (!normalizedTerm) {
          return null;
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 5);

    return res.json({
      totals: {
        users: userCount,
        searches: searchCount,
        recipes: recipeCount,
        ingredients: ingredientCount,
        aliases: aliasCount,
      },
      averages: {
        cookingTime: Number((averageCookingStats._avg.cookingTime || 0).toFixed(1)),
      },
      recipeTypes,
      topIngredients: topIngredients.map((row) => ({
        name: normalizeLabel(row.searchedIngredient),
        count: row._count.searchedIngredient,
      })),
      unmatchedSearchTerms,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createRecipe,
  createIngredient,
  analytics,
  deleteRecipe,
  listIngredients,
  listRecipes,
  updateRecipe,
};
