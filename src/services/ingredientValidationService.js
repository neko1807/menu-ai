const database = require('../db/database');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_TIMEOUT_MS = 10_000;

class IngredientValidationError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'IngredientValidationError';
    this.statusCode = statusCode;
  }
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('th-TH')
    .replace(/\s+/g, ' ');
}

function buildValidationPrompt(ingredients) {
  return [
    'คุณเป็นระบบตรวจสอบรายการวัตถุดิบสำหรับทำอาหารภาษาไทย',
    'ตรวจสอบทุกชื่อในรายการว่าคืออาหาร เครื่องดื่ม หรือวัตถุดิบ/เครื่องปรุงที่บริโภคได้หรือไม่',
    'ให้ false สำหรับสิ่งของ ภาชนะ อุปกรณ์ ขยะ หรือสิ่งที่รับประทานไม่ได้ เช่น ช้อน กระป๋องเปล่า จาน',
    'ให้ true สำหรับวัตถุดิบที่บริโภคได้ แม้ชื่อจะมีคำว่าภาชนะ เช่น ปลากระป๋อง',
    'ผลลัพธ์ต้องมีหนึ่งรายการต่อ input และใช้ name เดิมจาก input เท่านั้น',
    'reason จำเป็นเมื่อ isIngredient เป็น false และต้องสั้น กระชับ ภาษาไทย',
    '',
    `รายการที่ต้องตรวจสอบ:\n${ingredients.map((item) => `- ${item}`).join('\n')}`,
  ].join('\n');
}

const validationSchema = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          isIngredient: { type: 'boolean' },
          reason: { type: 'string' },
        },
        required: ['name', 'isIngredient'],
      },
    },
  },
  required: ['results'],
};

async function askGemini(ingredients) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new IngredientValidationError('ระบบยังไม่ได้กำหนด GEMINI_API_KEY สำหรับตรวจสอบวัตถุดิบ', 503);
  }

  const configuredModel = String(process.env.GEMINI_RECIPE_MODEL || '').trim();
  const model = !configuredModel || configuredModel === 'gemini-2.5-flash' || configuredModel === 'gemini-3.5-flash'
    ? 'gemini-3.6-flash'
    : configuredModel;
  let response;
  try {
    response = await fetch(
      `${GEMINI_API_URL}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildValidationPrompt(ingredients) }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: validationSchema,
            temperature: 0,
            maxOutputTokens: 900,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      },
    );
  } catch (error) {
    throw new IngredientValidationError(
      error?.name === 'TimeoutError'
        ? 'การตรวจสอบวัตถุดิบใช้เวลานานเกินไป กรุณาลองใหม่'
        : 'ไม่สามารถเชื่อมต่อ Gemini เพื่อตรวจสอบวัตถุดิบได้ กรุณาลองใหม่',
      503,
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = String(body?.error?.message || '').trim();
    throw new IngredientValidationError(
      detail ? `Gemini ไม่สามารถตรวจสอบวัตถุดิบได้: ${detail}` : 'Gemini ไม่สามารถตรวจสอบวัตถุดิบได้',
    );
  }

  const responseText = body?.candidates?.flatMap((candidate) => candidate?.content?.parts || [])
    .find((part) => typeof part?.text === 'string')?.text;
  try {
    const parsed = JSON.parse(responseText);
    return Array.isArray(parsed?.results) ? parsed.results : [];
  } catch {
    throw new IngredientValidationError('ไม่สามารถอ่านผลการตรวจสอบวัตถุดิบจาก Gemini ได้');
  }
}

async function findCachedInvalidIngredients(ingredients) {
  const normalized = ingredients.map(normalizeText);
  const result = await database.query(
    'SELECT normalized_name, reason FROM invalid_ingredients WHERE normalized_name = ANY($1::text[])',
    [normalized],
  );
  const cached = new Map(result.rows.map((row) => [row.normalized_name, row.reason]));

  return ingredients
    .filter((ingredient) => cached.has(normalizeText(ingredient)))
    .map((name) => ({ name, reason: cached.get(normalizeText(name)) || 'ไม่ใช่วัตถุดิบ' }));
}

async function saveInvalidIngredients(items) {
  await Promise.all(items.map(({ name, reason }) => database.query(
    `
      INSERT INTO invalid_ingredients (original_name, normalized_name, reason)
      VALUES ($1, $2, $3)
      ON CONFLICT (normalized_name) DO UPDATE SET
        original_name = EXCLUDED.original_name,
        reason = EXCLUDED.reason,
        updated_at = CURRENT_TIMESTAMP
    `,
    [name, normalizeText(name), reason],
  )));
}

async function validateIngredients(ingredients) {
  const cachedInvalid = await findCachedInvalidIngredients(ingredients);
  const cachedNames = new Set(cachedInvalid.map((item) => normalizeText(item.name)));
  const unknown = ingredients.filter((item) => !cachedNames.has(normalizeText(item)));

  if (!unknown.length) {
    return cachedInvalid;
  }

  const results = await askGemini(unknown);
  const resultByName = new Map(results.map((item) => [normalizeText(item.name), item]));
  const missingResults = unknown.filter((name) => !resultByName.has(normalizeText(name)));
  if (missingResults.length) {
    throw new IngredientValidationError('ระบบตรวจสอบวัตถุดิบได้ไม่ครบ กรุณาลองใหม่');
  }

  const invalidFromGemini = unknown
    .map((name) => ({ name, result: resultByName.get(normalizeText(name)) }))
    .filter(({ result }) => result?.isIngredient === false)
    .map(({ name, result }) => ({ name, reason: String(result.reason || 'ไม่ใช่วัตถุดิบ').trim() }));

  await saveInvalidIngredients(invalidFromGemini);
  return [...cachedInvalid, ...invalidFromGemini];
}

module.exports = { IngredientValidationError, validateIngredients };
