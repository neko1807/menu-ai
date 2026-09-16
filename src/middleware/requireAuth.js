const { verifyAuthToken } = require('../auth/token');

function requireAuth(req, res, next) {
  const authorization = String(req.headers.authorization || '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const auth = verifyAuthToken(token);

  if (!auth) {
    return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
  }

  req.auth = auth;
  return next();
}

module.exports = { requireAuth };
