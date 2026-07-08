const crypto = require('crypto');
const prisma = require('../config/prisma');
const {
  generateTokenId,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../config/jwt');

const REFRESH_COOKIE_NAME = 'menu-ai-refresh-token';
const REFRESH_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  };
}

function getRefreshCookieClearOptions() {
  return {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/auth',
  };
}

function getRefreshTokenExpiresAt() {
  return new Date(Date.now() + REFRESH_COOKIE_MAX_AGE);
}

async function issueTokenPair(user) {
  const familyId = crypto.randomUUID();
  const refreshTokenId = generateTokenId();
  const refreshToken = signRefreshToken({
    userId: user.id,
    role: user.role,
    familyId,
    tokenId: refreshTokenId,
  });

  await prisma.refreshToken.create({
    data: {
      id: refreshTokenId,
      userId: user.id,
      familyId,
      expiresAt: getRefreshTokenExpiresAt(),
    },
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken,
    user: toPublicUser(user),
  };
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl || null,
    role: user.role,
    createdAt: user.createdAt,
  };
}

async function resolveAuthenticatedUser(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
      tokenVersion: true,
      createdAt: true,
    },
  });
}

async function rotateRefreshToken(refreshTokenValue) {
  const payload = verifyRefreshToken(refreshTokenValue);
  const tokenId = payload?.jti;
  const userId = payload?.sub;

  if (!tokenId || !userId || payload?.tokenType !== 'refresh') {
    throw new Error('Invalid refresh token');
  }

  const currentToken = await prisma.refreshToken.findUnique({
    where: { id: tokenId },
  });

  if (!currentToken || currentToken.revokedAt || currentToken.expiresAt < new Date()) {
    throw new Error('Refresh token revoked');
  }

  const user = await resolveAuthenticatedUser(userId);

  if (!user) {
    throw new Error('User not found');
  }

  const nextTokenId = generateTokenId();
  const nextRefreshToken = signRefreshToken({
    userId: user.id,
    role: user.role,
    familyId: currentToken.familyId,
    tokenId: nextTokenId,
  });

  const nextTokenExpiresAt = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: tokenId },
      data: {
        revokedAt: new Date(),
        replacedByTokenId: nextTokenId,
      },
    }),
    prisma.refreshToken.create({
      data: {
        id: nextTokenId,
        userId: user.id,
        familyId: currentToken.familyId,
        expiresAt: nextTokenExpiresAt,
      },
    }),
  ]);

  return {
    accessToken: signAccessToken(user),
    refreshToken: nextRefreshToken,
    user: toPublicUser(user),
  };
}

async function revokeRefreshToken(refreshTokenValue) {
  const payload = verifyRefreshToken(refreshTokenValue);
  const tokenId = payload?.jti;

  if (!tokenId) {
    return;
  }

  await prisma.refreshToken.updateMany({
    where: {
      id: tokenId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

async function revokeAllRefreshTokens(userId) {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

function parseRefreshCookie(req) {
  return req.cookies?.[REFRESH_COOKIE_NAME] || null;
}

module.exports = {
  REFRESH_COOKIE_NAME,
  getRefreshCookieOptions,
  issueTokenPair,
  parseRefreshCookie,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  toPublicUser,
  resolveAuthenticatedUser,
  getRefreshCookieClearOptions,
};
