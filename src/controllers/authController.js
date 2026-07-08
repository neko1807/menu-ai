const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { verifyAccessToken } = require('../config/jwt');
const {
  REFRESH_COOKIE_NAME,
  getRefreshCookieClearOptions,
  getRefreshCookieOptions,
  issueTokenPair,
  parseRefreshCookie,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  toPublicUser,
} = require('../services/authService');

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const tokenPair = await issueTokenPair(user);

    res.cookie(REFRESH_COOKIE_NAME, tokenPair.refreshToken, getRefreshCookieOptions());

    return res.json({
      accessToken: tokenPair.accessToken,
      user: tokenPair.user,
    });
  } catch (error) {
    return next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = parseRefreshCookie(req);

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token missing.' });
    }

    const tokenPair = await rotateRefreshToken(refreshToken);

    res.cookie(REFRESH_COOKIE_NAME, tokenPair.refreshToken, getRefreshCookieOptions());

    return res.json({
      accessToken: tokenPair.accessToken,
      user: tokenPair.user,
    });
  } catch (error) {
    return res.status(401).json({ message: 'Session expired.' });
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = parseRefreshCookie(req);

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieClearOptions());

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function logoutAll(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await Promise.all([
      revokeAllRefreshTokens(userId),
      prisma.user.update({
        where: { id: userId },
        data: {
          tokenVersion: {
            increment: 1,
          },
        },
      }),
    ]);

    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieClearOptions());

    return res.status(204).send();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

async function me(req, res) {
  return res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      avatarUrl: req.user.avatarUrl || null,
      role: req.user.role,
      createdAt: req.user.createdAt,
    },
  });
}

async function updateProfile(req, res, next) {
  try {
    const name = String(req.body?.name || '').trim();

    if (!name) {
      return res.status(400).json({ message: 'Name is required.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name },
    });

    return res.json({
      message: 'Profile updated successfully.',
      user: toPublicUser(updatedUser),
    });
  } catch (error) {
    return next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatches) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await Promise.all([
      prisma.user.update({
        where: { id: req.user.id },
        data: {
          password: hashedPassword,
          tokenVersion: {
            increment: 1,
          },
        },
      }),
      revokeAllRefreshTokens(req.user.id),
    ]);

    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieClearOptions());

    return res.json({
      message: 'Password changed successfully. Please log in again.',
      requiresRelogin: true,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateAvatar(req, res, next) {
  try {
    const avatarUrl = String(req.body?.avatarUrl || '').trim();

    if (!avatarUrl) {
      return res.status(400).json({ message: 'Avatar image is required.' });
    }

    if (!avatarUrl.startsWith('data:image/')) {
      return res.status(400).json({ message: 'Invalid avatar format.' });
    }

    if (avatarUrl.length > 2_000_000) {
      return res.status(400).json({ message: 'Avatar image is too large.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl },
    });

    return res.json({
      message: 'Avatar updated successfully.',
      user: toPublicUser(updatedUser),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  changePassword,
  login,
  logout,
  logoutAll,
  me,
  refresh,
  updateAvatar,
  updateProfile,
};
