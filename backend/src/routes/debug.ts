import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import log from '../utils/logger';

const router = Router();

// Debug endpoint to check authentication and cookies
router.get('/auth-status', (req: Request, res: Response) => {
  log.info('🔍 AUTH STATUS CHECK', {
    cookies: req.cookies,
    headers: {
      cookie: req.headers.cookie,
      origin: req.headers.origin,
      referer: req.headers.referer,
      host: req.headers.host,
      'x-forwarded-host': req.headers['x-forwarded-host'],
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'x-real-ip': req.headers['x-real-ip']
    }
  });

  res.json({
    cookies: req.cookies,
    hasCookies: !!req.cookies && Object.keys(req.cookies).length > 0,
    hasAdminToken: !!req.cookies?.adminAccessToken,
    hasUserToken: !!req.cookies?.userAccessToken,
    headers: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      host: req.headers.host
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      cookieDomain: process.env.COOKIE_DOMAIN
    }
  });
});

// Test authenticated endpoint
router.get('/auth-test', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    authenticated: true,
    user: req.user ? {
      id: req.user._id,
      email: req.user.email,
      isAdmin: (req.user as any).isAdmin
    } : null,
    admin: req.admin ? {
      id: req.admin._id,
      email: req.admin.email,
      role: req.admin.role
    } : null
  });
});

// 管理者認証テスト用エンドポイント（/admin/パスを含む）
router.get('/admin/auth-test', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    authenticated: true,
    path: req.path,
    isAdminPath: req.path.includes('/admin/'),
    user: req.user ? {
      id: req.user._id,
      email: req.user.email,
      isAdmin: (req.user as any).isAdmin
    } : null,
    admin: req.admin ? {
      id: req.admin._id,
      email: req.admin.email,
      role: req.admin.role
    } : null
  });
});

export default router;