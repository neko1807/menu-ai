const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');
const recommendRoutes = require('./routes/recommendRoutes');

const app = express();

function parseAllowedOrigins(value) {
  return String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }

  return allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin === '*') {
      return true;
    }

    if (!allowedOrigin.includes('*')) {
      return allowedOrigin === origin;
    }

    const escapedPattern = allowedOrigin.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
    return new RegExp(`^${escapedPattern}$`).test(origin);
  });
}

const allowedOrigins = parseAllowedOrigins(
  process.env.CORS_ORIGIN || 'http://localhost:5173',
);

app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin, allowedOrigins)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/ai/recipe', (req, res) => {
  const ingredients = Array.isArray(req.body?.ingredients) ? req.body.ingredients : [];

  res.json({
    recipeIdea: {
      provider: 'fallback',
      title: 'เมนูสำรองของ menu-ai',
      summary: 'ระบบยังเตรียมเมนูสำรองให้ใช้งานได้',
      estimatedCookingTime: 15,
      difficulty: 'ง่าย',
      basedOn: [],
      usedIngredients: ingredients
        .map((ingredient) => String(ingredient || '').trim())
        .filter(Boolean)
        .map((name) => ({
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
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/recommend', recommendRoutes);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    message: 'Internal server error',
  });
});

module.exports = app;
