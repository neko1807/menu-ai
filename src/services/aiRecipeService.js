const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_TIMEOUT_MS = 30_000;

class GeminiServiceError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'GeminiServiceError';
    this.statusCode = statusCode;
  }
}

function resolveGeminiModel() {
  const configuredModel = String(process.env.GEMINI_RECIPE_MODEL || '').trim();

  if (!configuredModel || configuredModel === 'gemini-3.5-flash') {
    return 'gemini-2.5-flash';
  }

  return configuredModel;
}

const GEMINI_MODEL = resolveGeminiModel();

function buildRecipePrompt({ ingredients, notes }) {
  return [
    'คุณคือผู้ช่วยสร้างสูตรอาหารภาษาไทย',
    'สร้างสูตรจากวัตถุดิบที่ผู้ใช้มีอยู่จริงให้มากที่สุด',
    'usedIngredients ต้องมีเฉพาะวัตถุดิบที่อยู่ในรายการวัตถุดิบที่ผู้ใช้มี และให้ใช้ชื่อเดิมจากรายการ input',
    'วัตถุดิบ เครื่องปรุง น้ำมัน หรือส่วนประกอบอื่นทุกอย่างที่ไม่อยู่ในรายการ input ต้องใส่ใน missingIngredients เท่านั้น',
    'ห้ามนำวัตถุดิบที่ผู้ใช้ไม่ได้กรอกไปใส่ใน usedIngredients',
    'ถ้าต้องมีวัตถุดิบเพิ่ม ให้ระบุให้น้อยที่สุดและใส่ให้ครบใน missingIngredients',
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

function ingredientName(value) {
  if (typeof value === 'string') {
    return value.trim();
  }

  return String(value?.name || '').trim();
}

function normalizeIngredientLabel(value) {
  return ingredientName(value)
    .toLocaleLowerCase('th-TH')
    .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, '');
}

function matchesInputIngredient(value, normalizedInputs) {
  const normalizedValue = normalizeIngredientLabel(value);

  if (!normalizedValue) {
    return false;
  }

  return normalizedInputs.some((input) => (
    input === normalizedValue ||
    (input.length >= 2 && normalizedValue.length >= 2 && (
      input.includes(normalizedValue) || normalizedValue.includes(input)
    ))
  ));
}

function uniqueByIngredientName(values) {
  const seen = new Set();

  return values.filter((value) => {
    const normalized = normalizeIngredientLabel(value);
    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function reconcileRecipeIngredients(recipe, inputIngredients) {
  const normalizedInputs = inputIngredients.map(normalizeIngredientLabel).filter(Boolean);
  const usedIngredients = [];
  const missingIngredients = [];

  for (const item of Array.isArray(recipe?.usedIngredients) ? recipe.usedIngredients : []) {
    if (matchesInputIngredient(item, normalizedInputs)) {
      usedIngredients.push(item);
      continue;
    }

    const name = ingredientName(item);
    if (name) {
      missingIngredients.push(name);
    }
  }

  for (const item of Array.isArray(recipe?.missingIngredients) ? recipe.missingIngredients : []) {
    if (matchesInputIngredient(item, normalizedInputs)) {
      continue;
    }

    const name = ingredientName(item);
    if (name) {
      missingIngredients.push(name);
    }
  }

  return {
    ...recipe,
    usedIngredients: uniqueByIngredientName(usedIngredients),
    missingIngredients: uniqueByIngredientName(missingIngredients),
  };
}

async function generateRecipeIdea({ ingredients, notes }) {
  const cleanedIngredients = [...new Set((Array.isArray(ingredients) ? ingredients : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean))];

  if (!cleanedIngredients.length) {
    throw new GeminiServiceError('กรุณากรอกวัตถุดิบอย่างน้อย 1 รายการ', 400);
  }

  if (cleanedIngredients.length > 30 || cleanedIngredients.some((ingredient) => ingredient.length > 100)) {
    throw new GeminiServiceError('กรุณากรอกวัตถุดิบไม่เกิน 30 รายการ และไม่เกิน 100 ตัวอักษรต่อรายการ', 400);
  }

  const cleanedNotes = String(notes || '').trim();
  if (cleanedNotes.length > 500) {
    throw new GeminiServiceError('เงื่อนไขเพิ่มเติมต้องไม่เกิน 500 ตัวอักษร', 400);
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new GeminiServiceError('ระบบยังไม่ได้กำหนด GEMINI_API_KEY', 503);
  }

  let response;
  try {
    response = await fetch(
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
                    notes: cleanedNotes,
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
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      },
    );
  } catch (error) {
    const message = error?.name === 'TimeoutError'
      ? 'Gemini ใช้เวลาตอบกลับนานเกินไป กรุณาลองใหม่'
      : 'ไม่สามารถเชื่อมต่อ Gemini ได้ กรุณาลองใหม่';
    throw new GeminiServiceError(message, 503);
  }

  let responseBody;
  try {
    responseBody = await response.json();
  } catch {
    throw new GeminiServiceError('Gemini ส่งข้อมูลกลับมาในรูปแบบที่ไม่ถูกต้อง');
  }

  if (!response.ok) {
    const providerMessage = String(responseBody?.error?.message || '').trim();
    throw new GeminiServiceError(
      providerMessage ? `Gemini ไม่สามารถสร้างเมนูได้: ${providerMessage}` : 'Gemini ไม่สามารถสร้างเมนูได้',
    );
  }

  const candidateText = extractCandidateText(responseBody);
  if (!candidateText) {
    throw new GeminiServiceError('Gemini ไม่ได้ส่งรายละเอียดเมนูกลับมา');
  }

  try {
    const recipe = parseGeminiJson(candidateText);

    return {
      provider: 'gemini',
      ...reconcileRecipeIngredients(recipe, cleanedIngredients),
    };
  } catch {
    throw new GeminiServiceError('ไม่สามารถอ่านรายละเอียดเมนูจาก Gemini ได้');
  }
}

module.exports = {
  generateRecipeIdea,
};
