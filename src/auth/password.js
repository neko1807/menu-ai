const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, KEY_LENGTH);

  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  const [algorithm, salt, savedKey] = String(storedHash || '').split('$');

  if (algorithm !== 'scrypt' || !salt || !savedKey) {
    return false;
  }

  const derivedKey = await scrypt(password, salt, KEY_LENGTH);
  const savedKeyBuffer = Buffer.from(savedKey, 'hex');

  return savedKeyBuffer.length === derivedKey.length
    && timingSafeEqual(savedKeyBuffer, derivedKey);
}

module.exports = { hashPassword, verifyPassword };
