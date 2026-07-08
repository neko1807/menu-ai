const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function getAccessSecret() {
  return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
}

function getRefreshSecret() {
  return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
}

function assertSecret(secret, label) {
  if (!secret) {
    throw new Error(`${label} is not configured`);
  }
}

function accessExpiresIn() {
  return process.env.JWT_ACCESS_EXPIRES_IN || '15m';
}

function refreshExpiresIn() {
  return process.env.JWT_REFRESH_EXPIRES_IN || '30d';
}

function generateTokenId() {
  return crypto.randomUUID();
}

function signAccessToken(user) {
  const secret = getAccessSecret();
  assertSecret(secret, 'JWT access secret');

  return jwt.sign(
    {
      role: user.role,
      email: user.email,
      tokenType: 'access',
      ver: user.tokenVersion ?? 0,
    },
    secret,
    {
      subject: user.id,
      expiresIn: accessExpiresIn(),
    },
  );
}

function verifyAccessToken(token) {
  const secret = getAccessSecret();
  assertSecret(secret, 'JWT access secret');
  return jwt.verify(token, secret);
}

function signRefreshToken({ userId, role, familyId, tokenId }) {
  const secret = getRefreshSecret();
  assertSecret(secret, 'JWT refresh secret');

  return jwt.sign(
    {
      role,
      familyId,
      tokenType: 'refresh',
    },
    secret,
    {
      subject: userId,
      jwtid: tokenId,
      expiresIn: refreshExpiresIn(),
    },
  );
}

function verifyRefreshToken(token) {
  const secret = getRefreshSecret();
  assertSecret(secret, 'JWT refresh secret');
  return jwt.verify(token, secret);
}

module.exports = {
  accessExpiresIn,
  generateTokenId,
  refreshExpiresIn,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
