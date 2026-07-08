const express = require('express');
const {
  changePassword,
  login,
  logout,
  logoutAll,
  me,
  refresh,
  updateAvatar,
  updateProfile,
} = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/logout-all', requireAuth, logoutAll);
router.get('/me', requireAuth, me);
router.put('/me', requireAuth, updateProfile);
router.put('/password', requireAuth, changePassword);
router.put('/avatar', requireAuth, updateAvatar);

module.exports = router;
