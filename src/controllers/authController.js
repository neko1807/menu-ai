const database = require('../db/database');
const { hashPassword, verifyPassword } = require('../auth/password');
const { createAuthToken } = require('../auth/token');

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validateCredentials(email, password) {
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    return 'กรุณากรอกอีเมลให้ถูกต้อง';
  }

  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return 'รหัสผ่านต้องมี 8–128 ตัวอักษร';
  }

  return null;
}

function publicUser(row) {
  return { id: Number(row.id), email: row.email };
}

async function register(req, res, next) {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  const validationMessage = validateCredentials(email, password);

  if (validationMessage) {
    return res.status(400).json({ message: validationMessage });
  }

  try {
    const passwordHash = await hashPassword(password);
    const result = await database.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash],
    );
    const user = publicUser(result.rows[0]);

    return res.status(201).json({ user, token: createAuthToken(user.id) });
  } catch (error) {
    if (error?.code === '23505') {
      return res.status(409).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    return next(error);
  }
}

async function login(req, res, next) {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || typeof password !== 'string') {
    return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
  }

  try {
    const result = await database.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email],
    );
    const user = result.rows[0];

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const publicProfile = publicUser(user);
    return res.json({ user: publicProfile, token: createAuthToken(publicProfile.id) });
  } catch (error) {
    return next(error);
  }
}

async function getCurrentUser(req, res, next) {
  try {
    const result = await database.query(
      'SELECT id, email FROM users WHERE id = $1',
      [req.auth.userId],
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'ไม่พบบัญชีผู้ใช้' });
    }

    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getCurrentUser, login, register };
