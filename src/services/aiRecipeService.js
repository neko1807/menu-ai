const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = process.env.GEMINI_RECIPE_MODEL || 'gemini-2.5-flash';

function buildRecipePrompt({ ingredients, notes }) {
  return [
    'คุณคือผู้ช่วยสร้างสูตรอาหารภาษาไทย',
    'สร้างสูตรจากวัตถุดิบที่ผู้ใช้มีอยู่จริงให้มากที่สุด',
    'ถ้าต้องมีวัตถุดิบเพิ่ม ให้ระบุให้น้อยที่สุดและบอกเหตุผลให้ชัด',
    'ห้ามอ้างอิงเมนูฐานข้อมูลหรือเมนูเดิม',
    'ตอบกลับเป็น JSON เท่านั้นตาม schema ที่กำหนด',
    '',
    `วัตถุดิบที่มี: ${ingredients.join(', ')}`,
    `เงื่อนไขเพิ่มเติม: ${notes || 'ไม่มี'}`,
  ].join('\n');
}

function buildOutputSchema() {
  return {
    type: 'object',
    properties: {
      title: { type: 'string' },
      summary: { type: 'string' },
      estimatedCookingTime: { type: 'integer' },
      difficulty: {
        type: 'string',
        enum: ['ง่าย', 'ปานกลาง', 'ยาก'],
      },
      basedOn: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            recipeTitle: { type: 'string' },
            reason: { type: 'string' },
          },
          required: ['recipeTitle', 'reason'],
        },
      },
      usedIngredients: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            reason: { type: 'string' },
          },
          required: ['name', 'reason'],
        },
      },
      missingIngredients: {
        type: 'array',
        items: { type: 'string' },
      },
      substitutionSuggestions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            reason: { type: 'string' },
          },
          required: ['from', 'to', 'reason'],
        },
      },
      steps: {
        type: 'array',
        items: { type: 'string' },
      },
      tips: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: [
      'title',
      'summary',
      'estimatedCookingTime',
      'difficulty',
      'basedOn',
      'usedIngredients',
      'missingIngredients',
      'substitutionSuggestions',
      'steps',
      'tips',
    ],
  };
}

function parseGeminiJson(responseText) {
  const rawText = String(responseText || '').trim();

  if (!rawText) {
    throw new Error('Gemini response was empty.');
  }

  return JSON.parse(rawText);
}

function extractCandidateText(responseBody) {
  const candidates = Array.isArray(responseBody?.candidates) ? responseBody.candidates : [];

  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      if (typeof part?.text === 'string' && part.text.trim()) {
        return part.text;
      }
    }
  }

  return '';
}

async function buildFallbackRecipe({ ingredients, notes }) {
  const usedIngredients = ingredients.map((ingredient) => ({
    name: ingredient,
    reason: 'วัตถุดิบที่ผู้ใช้มีอยู่',
  }));

  return {
    provider: 'fallback',
    title: `เมนู${ingredients[0] || 'ง่าย ๆ'}แบบเร็ว`,
    summary: `เมนูสำรองที่สร้างจากวัตถุดิบที่มีอยู่ ${ingredients.join(', ')}${notes ? ` และคำนึงถึงเงื่อนไข: ${notes}` : ''}`,
    estimatedCookingTime: 15,
    difficulty: 'ง่าย',
    basedOn: [],
    usedIngredients,
    missingIngredients: [],
    substitutionSuggestions: [],
    steps: [
      'เตรียมวัตถุดิบให้พร้อม',
      'ปรุงหรือผัดวัตถุดิบหลักจนสุก',
      'ปรุงรสตามชอบและจัดเสิร์ฟ',
    ],
    tips: [
      'ถ้ามีผักหรือเครื่องปรุงที่เข้ากัน สามารถเติมเพิ่มได้',
      'ถ้าอยากได้ผลลัพธ์แม่นยำขึ้น ให้พิมพ์วัตถุดิบให้ครบ',
    ],
  };
}

async function generateRecipeIdea({ ingredients, notes }) {
  const cleanedIngredients = [...new Set((Array.isArray(ingredients) ? ingredients : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean))];

  if (!cleanedIngredients.length) {
    throw new Error('At least one ingredient is required.');
  }

  const fallback = await buildFallbackRecipe({
    ingredients: cleanedIngredients,
    notes,
  });

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return {
      ...fallback,
      providerError: 'GEMINI_API_KEY is not configured.',
    };
  }

  try {
    const response = await fetch(
      `${GEMINI_API_URL}/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: buildRecipePrompt({
                    ingredients: cleanedIngredients,
                    notes,
                  }),
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: buildOutputSchema(),
            temperature: 0.7,
          },
        }),
      },
    );

    const responseBody = await response.json();

    if (!response.ok) {
      return {
        ...fallback,
        provider: 'fallback',
        providerError: responseBody?.error?.message || 'Gemini request failed.',
      };
    }

    const candidateText = extractCandidateText(responseBody);
    if (!candidateText) {
      return {
        ...fallback,
        provider: 'fallback',
        providerError: 'Gemini response did not include text output.',
      };
    }

    return {
      provider: 'gemini',
      ...parseGeminiJson(candidateText),
    };
  } catch (error) {
    return {
      ...fallback,
      provider: 'fallback',
      providerError: `Gemini unavailable: ${error.message}`,
    };
  }
}

module.exports = {
  generateRecipeIdea,
};
