const { validateIngredients } = require('./ingredientValidationService');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_TIMEOUT_MS = 30_000;

class GeminiServiceError extends Error {
  constructor(message, statusCode = 502, invalidIngredients = []) {
    super(message);
    this.name = 'GeminiServiceError';
    this.statusCode = statusCode;
    this.invalidIngredients = invalidIngredients;
  }
}

function resolveGeminiModel() {
  const configuredModel = String(process.env.GEMINI_RECIPE_MODEL || '').trim();

  return !configuredModel || configuredModel === 'gemini-2.5-flash' || configuredModel === 'gemini-3.5-flash'
    ? 'gemini-3.6-flash'
    : configuredModel;
}

const GEMINI_MODEL = resolveGeminiModel();

function buildRecommendationsPrompt({ ingredients, notes }) {
  return [
    'คุณเป็นผู้ช่วยแนะนำเมนูอาหารภาษาไทย',
    'แนะนำเมนูที่แตกต่างกันให้ครบ 5 เมนู จากวัตถุดิบของผู้ใช้',
    'ตอบเฉพาะข้อมูลสั้นตาม schema: ชื่อเมนู สรุปไม่เกิน 20 คำ เวลาทำ และระดับความยาก',
    'ห้ามใส่รายการวัตถุดิบ ขั้นตอนทำ หรือเคล็ดลับ เพราะระบบจะขอรายละเอียดเฉพาะเมนูที่ผู้ใช้เลือกภายหลัง',
    '',
    `วัตถุดิบที่มี: ${ingredients.join(', ')}`,
    `เงื่อนไขเพิ่มเติม: ${notes || 'ไม่มี'}`,
  ].join('\n');
}

function buildRecipeDetailPrompt({ ingredients, notes, selectedRecipe }) {
  return [
    'คุณเป็นผู้ช่วยสร้างสูตรอาหารภาษาไทย',
    `สร้างรายละเอียดสำหรับเมนู "${selectedRecipe.title}" เท่านั้น`,
    'usedIngredients ต้องมีเฉพาะวัตถุดิบที่อยู่ในรายการ input และใช้ชื่อเดิมจาก input',
    'วัตถุดิบ เครื่องปรุง น้ำมัน หรือส่วนประกอบทุกอย่างที่ไม่มีใน input ต้องอยู่ใน missingIngredients',
    'ขั้นตอนทำกระชับและทำได้จริง พร้อมเคล็ดลับที่จำเป็นเท่านั้น',
    '',
    `สรุปเมนูที่เลือก: ${selectedRecipe.summary}`,
    `วัตถุดิบที่มี: ${ingredients.join(', ')}`,
    `เงื่อนไขเพิ่มเติม: ${notes || 'ไม่มี'}`,
  ].join('\n');
}

function buildRecommendationSchema() {
  return {
    type: 'object',
    properties: {
      title: { type: 'string' },
      summary: { type: 'string' },
      estimatedCookingTime: { type: 'integer' },
      difficulty: { type: 'string', enum: ['ง่าย', 'ปานกลาง', 'ท้าทาย'] },
    },
    required: ['title', 'summary', 'estimatedCookingTime', 'difficulty'],
  };
}

function buildRecommendationsSchema() {
  return {
    type: 'object',
    properties: {
      recipes: {
        type: 'array',
        minItems: 5,
        maxItems: 5,
        items: buildRecommendationSchema(),
      },
    },
    required: ['recipes'],
  };
}

function buildRecipeDetailSchema() {
  return {
    type: 'object',
    properties: {
      title: { type: 'string' },
      summary: { type: 'string' },
      estimatedCookingTime: { type: 'integer' },
      difficulty: { type: 'string', enum: ['ง่าย', 'ปานกลาง', 'ท้าทาย'] },
      usedIngredients: {
        type: 'array',
        items: {
          type: 'object',
          properties: { name: { type: 'string' }, reason: { type: 'string' } },
          required: ['name', 'reason'],
        },
      },
      missingIngredients: { type: 'array', items: { type: 'string' } },
      steps: { type: 'array', items: { type: 'string' } },
      tips: { type: 'array', items: { type: 'string' } },
    },
    required: [
      'title',
      'summary',
      'estimatedCookingTime',
      'difficulty',
      'usedIngredients',
      'missingIngredients',
      'steps',
      'tips',
    ],
  };
}

function parseGeminiJson(responseText) {
  const rawText = String(responseText || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

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
  return typeof value === 'string' ? value.trim() : String(value?.name || '').trim();
}

function normalizeIngredientLabel(value) {
  return ingredientName(value)
    .toLocaleLowerCase('th-TH')
    .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, '');
}

function matchesInputIngredient(value, normalizedInputs) {
  const normalizedValue = normalizeIngredientLabel(value);

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
    } else if (ingredientName(item)) {
      missingIngredients.push(ingredientName(item));
    }
  }

  for (const item of Array.isArray(recipe?.missingIngredients) ? recipe.missingIngredients : []) {
    if (!matchesInputIngredient(item, normalizedInputs) && ingredientName(item)) {
      missingIngredients.push(ingredientName(item));
    }
  }

  return {
    ...recipe,
    usedIngredients: uniqueByIngredientName(usedIngredients),
    missingIngredients: uniqueByIngredientName(missingIngredients),
  };
}

function cleanRecipeRequest({ ingredients, notes }) {
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

  return { cleanedIngredients, cleanedNotes };
}

async function validateAndCleanRecipeRequest({ ingredients, notes }) {
  const { cleanedIngredients, cleanedNotes } = cleanRecipeRequest({ ingredients, notes });
  const invalidIngredients = await validateIngredients(cleanedIngredients);
  if (invalidIngredients.length > 0) {
    throw new GeminiServiceError(
      'พบรายการที่ไม่ใช่วัตถุดิบ กรุณานำออกก่อนสร้างเมนู',
      400,
      invalidIngredients,
    );
  }

  return { cleanedIngredients, cleanedNotes };
}

async function requestGeminiJson({ prompt, schema, maxOutputTokens }) {
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
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.7,
            maxOutputTokens,
            thinkingConfig: {
              thinkingBudget: 0,
            },
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

  if (responseBody?.candidates?.some((candidate) => candidate?.finishReason === 'MAX_TOKENS')) {
    throw new GeminiServiceError('Gemini ส่งข้อมูลเมนูมาไม่ครบ กรุณาลองใหม่');
  }

  try {
    return parseGeminiJson(candidateText);
  } catch {
    throw new GeminiServiceError('ไม่สามารถอ่านรายละเอียดเมนูจาก Gemini ได้');
  }
}

async function generateRecipeIdea({ ingredients, notes }) {
  const { cleanedIngredients, cleanedNotes } = await validateAndCleanRecipeRequest({ ingredients, notes });
  const response = await requestGeminiJson({
    prompt: buildRecommendationsPrompt({ ingredients: cleanedIngredients, notes: cleanedNotes }),
    schema: buildRecommendationsSchema(),
    maxOutputTokens: 1200,
  });
  const recipes = Array.isArray(response?.recipes) ? response.recipes : [];

  if (recipes.length !== 5 || new Set(recipes.map((recipe) => recipe.title.trim())).size !== 5) {
    throw new GeminiServiceError('Gemini ไม่ได้ส่งเมนูที่แตกต่างกันครบ 5 เมนู');
  }

  return { provider: 'gemini', recipes };
}

async function generateRecipeDetails({ ingredients, notes, selectedRecipe }) {
  // รายการนี้ผ่านการตรวจแล้วก่อนถูกบันทึกเป็น recommendation จึงไม่ต้องเรียก Gemini ซ้ำ
  const { cleanedIngredients, cleanedNotes } = cleanRecipeRequest({ ingredients, notes });
  const recipe = await requestGeminiJson({
    prompt: buildRecipeDetailPrompt({
      ingredients: cleanedIngredients,
      notes: cleanedNotes,
      selectedRecipe,
    }),
    schema: buildRecipeDetailSchema(),
    maxOutputTokens: 900,
  });

  return {
    provider: 'gemini',
    ...reconcileRecipeIngredients(recipe, cleanedIngredients),
  };
}

module.exports = {
  GeminiServiceError,
  generateRecipeIdea,
  generateRecipeDetails,
};
