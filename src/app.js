const express = require('express');
const cors = require('cors');
const aiRoutes = require('./routes/aiRoutes');

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

    const escapedPattern = allowedOrigin.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
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
  }),
);
app.use(express.json({ limit: '20kb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/ai', aiRoutes);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    message: 'Internal server error',
  });
});

module.exports = app;
