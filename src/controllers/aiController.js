function buildEmergencyRecipeIdea(message, ingredients = []) {
  const cleanedIngredients = Array.isArray(ingredients)
    ? ingredients.map((ingredient) => String(ingredient || '').trim()).filter(Boolean)
    : [];

  return {
    provider: 'fallback',
    title: 'เมนูสำรองของ menu-ai',
    summary: message || 'ระบบยังเตรียมเมนูสำรองให้ใช้งานได้',
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

async function createRecipeIdea(req, res) {
  const ingredients = Array.isArray(req.body?.ingredients) ? req.body.ingredients : [];

  return res.json({
    recipeIdea: buildEmergencyRecipeIdea('ระบบยังเตรียมเมนูสำรองให้ใช้งานได้', ingredients),
  });
}

module.exports = {
  createRecipeIdea,
};
