require('dotenv').config();

const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/prisma');
const { normalizeSearchTerm } = require('../src/utils/ingredientMatcher');

async function main() {
  const forceSeed = process.env.FORCE_SEED === 'true';
  const [userCount, recipeCount, ingredientCount] = await Promise.all([
    prisma.user.count(),
    prisma.recipe.count(),
    prisma.ingredient.count(),
  ]);

  if (!forceSeed && (userCount > 0 || recipeCount > 0 || ingredientCount > 0)) {
    console.log('Seed skipped because data already exists. Set FORCE_SEED=true to reset.');
    return;
  }

  await prisma.$transaction([
    prisma.recipeIngredient.deleteMany(),
    prisma.searchHistory.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.ingredientAlias.deleteMany(),
    prisma.ingredient.deleteMany(),
    prisma.recipe.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@menu-ai.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';
  const userEmail = process.env.USER_EMAIL || 'user@menu-ai.local';
  const userPassword = process.env.USER_PASSWORD || 'user1234';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const hashedUserPassword = await bcrypt.hash(userPassword, 10);

  const admin = await prisma.user.create({
    data: {
      id: 'user_admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
      name: 'Admin',
    },
  });

  const user = await prisma.user.create({
    data: {
      id: 'user_regular',
      email: userEmail,
      password: hashedUserPassword,
      role: 'USER',
      name: 'User',
    },
  });

  const recipes = [
    {
      id: 'recipe_egg_pork_omelette',
      title: 'ไข่เจียวหมูสับ',
      instruction: 'ตีไข่ ปรุงรส ใส่หมูสับและต้นหอม แล้วทอดจนเหลืองกรอบ',
      cookingTime: 15,
      type: 'GENERAL',
    },
    {
      id: 'recipe_chicken_salad',
      title: 'สลัดอกไก่',
      instruction: 'ย่างอกไก่ คลุกกับผักสลัดและน้ำสลัดเพื่อสุขภาพ',
      cookingTime: 20,
      type: 'HEALTHY',
    },
    {
      id: 'recipe_tofu_stir_fry',
      title: 'ผัดผักเต้าหู้',
      instruction: 'ผัดเต้าหู้กับบรอกโคลีและแครอท ปรุงรสอ่อน ๆ',
      cookingTime: 12,
      type: 'VEGETARIAN',
    },
    {
      id: 'recipe_shrimp_fried_rice',
      title: 'ข้าวผัดกุ้ง',
      instruction: 'ผัดข้าวกับกุ้ง ไข่ และผักรวมให้หอม',
      cookingTime: 18,
      type: 'GENERAL',
    },
    {
      id: 'recipe_pork_tofu_soup',
      title: 'ต้มจืดเต้าหู้หมูสับ',
      instruction: 'ต้มหมูสับกับเต้าหู้และผักจนน้ำซุปหวาน',
      cookingTime: 25,
      type: 'HEALTHY',
    },
  ];

  const ingredients = [
    { id: 'ing_egg', name: 'ไข่ไก่' },
    { id: 'ing_pork_minced', name: 'หมูสับ' },
    { id: 'ing_spring_onion', name: 'ต้นหอม' },
    { id: 'ing_chicken_breast', name: 'อกไก่' },
    { id: 'ing_salad', name: 'ผักสลัด' },
    { id: 'ing_tomato', name: 'มะเขือเทศ' },
    { id: 'ing_tofu', name: 'เต้าหู้' },
    { id: 'ing_broccoli', name: 'บรอกโคลี' },
    { id: 'ing_carrot', name: 'แครอท' },
    { id: 'ing_shrimp', name: 'กุ้ง' },
    { id: 'ing_rice', name: 'ข้าวสวย' },
    { id: 'ing_garlic', name: 'กระเทียม' },
    { id: 'ing_onion', name: 'หอมใหญ่' },
  ];

  const ingredientIndex = new Map();

  for (const ingredient of ingredients) {
    const record = await prisma.ingredient.create({
      data: ingredient,
    });

    ingredientIndex.set(record.name, record);
  }

  const ingredientAliases = [
    { ingredientName: 'ไข่ไก่', alias: 'ไข่' },
    { ingredientName: 'หมูสับ', alias: 'หมูบด' },
    { ingredientName: 'ต้นหอม', alias: 'หอมต้น' },
    { ingredientName: 'อกไก่', alias: 'chicken breast' },
    { ingredientName: 'ผักสลัด', alias: 'สลัด' },
    { ingredientName: 'มะเขือเทศ', alias: 'tomato' },
    { ingredientName: 'เต้าหู้', alias: 'tofu' },
    { ingredientName: 'บรอคโคลี', alias: 'broccoli' },
    { ingredientName: 'แครอท', alias: 'carrot' },
    { ingredientName: 'กุ้ง', alias: 'shrimp' },
    { ingredientName: 'ข้าวสวย', alias: 'ข้าว' },
    { ingredientName: 'กระเทียม', alias: 'garlic' },
    { ingredientName: 'หอมใหญ่', alias: 'onion' },
  ].filter((entry) => ingredientIndex.has(entry.ingredientName));

  await prisma.ingredientAlias.createMany({
    data: ingredientAliases.map((entry) => ({
      ingredientId: ingredientIndex.get(entry.ingredientName).id,
      alias: entry.alias,
      normalizedAlias: normalizeSearchTerm(entry.alias),
    })),
  });

  for (const recipe of recipes) {
    await prisma.recipe.create({
      data: recipe,
    });
  }

  const recipeIngredients = [
    { recipeId: 'recipe_egg_pork_omelette', ingredientName: 'ไข่ไก่', quantity: '2.00', unit: 'ฟอง' },
    { recipeId: 'recipe_egg_pork_omelette', ingredientName: 'หมูสับ', quantity: '100.00', unit: 'กรัม' },
    { recipeId: 'recipe_egg_pork_omelette', ingredientName: 'ต้นหอม', quantity: '1.00', unit: 'ต้น' },
    { recipeId: 'recipe_chicken_salad', ingredientName: 'อกไก่', quantity: '150.00', unit: 'กรัม' },
    { recipeId: 'recipe_chicken_salad', ingredientName: 'ผักสลัด', quantity: '1.00', unit: 'ถุง' },
    { recipeId: 'recipe_chicken_salad', ingredientName: 'มะเขือเทศ', quantity: '2.00', unit: 'ลูก' },
    { recipeId: 'recipe_tofu_stir_fry', ingredientName: 'เต้าหู้', quantity: '1.00', unit: 'ก้อน' },
    { recipeId: 'recipe_tofu_stir_fry', ingredientName: 'บรอกโคลี', quantity: '1.00', unit: 'หัว' },
    { recipeId: 'recipe_tofu_stir_fry', ingredientName: 'แครอท', quantity: '1.00', unit: 'หัว' },
    { recipeId: 'recipe_shrimp_fried_rice', ingredientName: 'กุ้ง', quantity: '100.00', unit: 'กรัม' },
    { recipeId: 'recipe_shrimp_fried_rice', ingredientName: 'ข้าวสวย', quantity: '2.00', unit: 'ถ้วย' },
    { recipeId: 'recipe_shrimp_fried_rice', ingredientName: 'ไข่ไก่', quantity: '1.00', unit: 'ฟอง' },
    { recipeId: 'recipe_pork_tofu_soup', ingredientName: 'เต้าหู้', quantity: '1.00', unit: 'ก้อน' },
    { recipeId: 'recipe_pork_tofu_soup', ingredientName: 'หมูสับ', quantity: '100.00', unit: 'กรัม' },
    { recipeId: 'recipe_pork_tofu_soup', ingredientName: 'หอมใหญ่', quantity: '0.50', unit: 'ลูก' },
  ];

  await prisma.recipeIngredient.createMany({
    data: recipeIngredients.map((entry) => ({
      recipeId: entry.recipeId,
      ingredientId: ingredientIndex.get(entry.ingredientName).id,
      quantity: entry.quantity,
      unit: entry.unit,
    })),
  });

  const searchSamples = [
    ['userId', user.id, 'ไข่ไก่', 6],
    ['userId', user.id, 'หมูสับ', 5],
    ['userId', user.id, 'ต้นหอม', 4],
    ['userId', user.id, 'หอมใหญ่', 3],
    ['userId', user.id, 'กระเทียม', 2],
    ['userId', admin.id, 'ไข่ไก่', 2],
    ['userId', admin.id, 'เต้าหู้', 3],
    ['userId', admin.id, 'ผักสลัด', 2],
  ];

  const searchHistoryRows = [];

  for (const [, userId, searchedIngredient, count] of searchSamples) {
    for (let index = 0; index < count; index += 1) {
      searchHistoryRows.push({
        id: randomUUID(),
        userId,
        searchedIngredient,
      });
    }
  }

  await prisma.searchHistory.createMany({
    data: searchHistoryRows,
  });

  console.log(`Seeded admin user: ${adminEmail}`);
  console.log(`Seeded user: ${userEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
