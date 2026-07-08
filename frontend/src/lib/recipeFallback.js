function cleanIngredientNames(ingredients) {
  if (!Array.isArray(ingredients)) {
    return [];
  }

  return [...new Set(
    ingredients
      .map((ingredient) => String(ingredient || '').trim())
      .filter(Boolean),
  )];
}

export function buildLocalRecipeIdea({ ingredients = [], notes = '' } = {}) {
  const cleanedIngredients = cleanIngredientNames(ingredients);
  const noteText = String(notes || '').trim();

  return {
    provider: 'fallback',
    title: 'เมนูสำรองของ menu-ai',
    summary: noteText
      ? `ระบบยังเตรียมเมนูสำรองให้ใช้งานได้ และคำนึงถึงเงื่อนไขที่คุณบอกไว้: ${noteText}`
      : 'ระบบยังเตรียมเมนูสำรองให้ใช้งานได้',
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
    tips: noteText
      ? [
          `เงื่อนไขที่ตั้งไว้: ${noteText}`,
          'หากต้องการผลลัพธ์ละเอียดขึ้น ให้ลองใหม่อีกครั้งเมื่อระบบพร้อม',
        ]
      : [
          'หากต้องการผลลัพธ์ละเอียดขึ้น ให้ลองใหม่อีกครั้งเมื่อระบบพร้อม',
        ],
  };
}
