const database = require('../db/database');

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function toMealLog(row) {
  return {
    id: Number(row.id),
    title: row.title,
    summary: row.summary,
    cookingTime: row.cooking_time === null ? null : Number(row.cooking_time),
    loggedAt: row.logged_at,
  };
}

async function createMealLog({ userId, title, summary, cookingTime }) {
  const cleanedTitle = cleanText(title, 160);
  const cleanedSummary = cleanText(summary, 500);
  const parsedCookingTime = Number(cookingTime);

  if (!cleanedTitle) {
    const error = new Error('ไม่พบชื่อเมนูที่ต้องการบันทึก');
    error.statusCode = 400;
    throw error;
  }

  const result = await database.query(
    `
      INSERT INTO meal_logs (user_id, title, summary, cooking_time)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, summary, cooking_time, logged_at
    `,
    [
      userId,
      cleanedTitle,
      cleanedSummary,
      Number.isInteger(parsedCookingTime) && parsedCookingTime >= 0 ? parsedCookingTime : null,
    ],
  );

  return toMealLog(result.rows[0]);
}

async function listMealLogs(userId) {
  const result = await database.query(
    `
      SELECT id, title, summary, cooking_time, logged_at
      FROM meal_logs
      WHERE user_id = $1
      ORDER BY logged_at DESC, id DESC
      LIMIT 20
    `,
    [userId],
  );

  return result.rows.map(toMealLog);
}

module.exports = { createMealLog, listMealLogs };
