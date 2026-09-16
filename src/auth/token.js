const { createHmac, timingSafeEqual } = require('crypto');

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function getTokenSecret() {
  const secret = String(process.env.AUTH_TOKEN_SECRET || '').trim();

  if (secret.length < 32) {
    throw new Error('AUTH_TOKEN_SECRET must contain at least 32 characters');
  }

  return secret;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(value) {
  return createHmac('sha256', getTokenSecret()).update(value).digest('base64url');
}

function createAuthToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  const payload = encode({ sub: String(userId), iat: now, exp: now + TOKEN_TTL_SECONDS });

  return `${payload}.${sign(payload)}`;
}

function verifyAuthToken(token) {
  const [payload, signature] = String(token || '').split('.');

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const userId = Number(decoded.sub);
    const now = Math.floor(Date.now() / 1000);

    if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(decoded.exp) || decoded.exp <= now) {
      return null;
    }

    return { userId };
  } catch {
    return null;
  }
}

module.exports = { createAuthToken, verifyAuthToken };
