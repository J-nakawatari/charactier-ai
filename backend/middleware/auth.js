const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './backend/.env' });

// モックモード判定
const USE_MOCK = process.env.USE_MOCK === 'true' || !process.env.MONGO_URI || process.env.MONGO_URI.includes('localhost:27017');

const log = (...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
  log('=== Auth Middleware ===');
  log('Request path:', req.path);
  
  // モックモードの場合は認証をスキップ
  if (USE_MOCK) {
    log('🎭 モックモード: 認証をスキップして仮ユーザーを設定');
    req.user = {
      id: 'mock-user-id',
      email: 'test@example.com',
      isActive: true,
      tokenBalance: 1000
    };
    return next();
  }

  log('Request headers:', JSON.stringify(req.headers, null, 2));
  log('All cookies:', JSON.stringify(req.cookies, null, 2));

  // Cookie or Authorization ヘッダー両対応
  const token =
    req.cookies?.token ||
    (req.headers.authorization?.startsWith('Bearer ') &&
      req.headers.authorization.split(' ')[1]);

  log('Token resolved:', token ? token.substring(0, 20) + '...' : 'Not found');

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    log('✅ Token verified successfully:', decoded.user.id);
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};