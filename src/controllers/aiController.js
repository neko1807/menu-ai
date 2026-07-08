const { generateRecipeIdea } = require('../services/aiRecipeService');

function buildEmergencyRecipeIdea(message, ingredients = []) {
  const cleanedIngredients = Array.isArray(ingredients)
    ? ingredients.map((ingredient) => String(ingredient || '').trim()).filter(Boolean)
    : [];

  return {
    provider: 'fallback',
    title: 'เมนูสำรองของ menu-ai',
    summary: message || 'ระบบกำลังใช้โหมดสำรอง เพราะการสร้างสูตรอัตโนมัติไม่พร้อมใช้งานชั่วคราว',
    estimatedCookingTime: 15,
    difficulty: 'ง่าย',
    basedOn: [],
    usedIngredients: cleanedIngredients.map((name) => ({
      name,
      reason: 'วัตถุดิบที่ผู้ใช้มีอยู่',
    })),
    missingIngredients: [],
    substitutionSuggestions: [],
    steps: [
      'เตรียมวัตถุดิบทั้งหมดให้พร้อม',
      'ปรุงหรือผัดตามความถนัด',
      'ปรับรสแล้วจัดเสิร์ฟ',
    ],
    tips: [
      'หากต้องการผลลัพธ์ละเอียดขึ้น ให้ลองใหม่อีกครั้งเมื่อระบบพร้อม',
    ],
  };
}

async function createRecipeIdea(req, res, next) {
  try {
    const ingredients = Array.isArray(req.body?.ingredients) ? req.body.ingredients : [];
    const notes = String(req.body?.notes || '').trim();

    const result = await generateRecipeIdea({ ingredients, notes });

    return res.json({
      recipeIdea: result,
    });
  } catch (error) {
    console.error('AI recipe generation failed:', error);

    return res.status(200).json({
      recipeIdea: buildEmergencyRecipeIdea(
        'ระบบสร้างสูตรขัดข้องชั่วคราว แต่ยังแสดงเมนูสำรองให้ใช้งานได้',
        req.body?.ingredients,
      ),
    });
  }
}

module.exports = {
  createRecipeIdea,
};
