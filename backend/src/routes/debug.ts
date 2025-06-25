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

// デバッグ用のルート一覧
router.get('/routes', (req: Request, res: Response) => {
  const routes: any[] = [];
  
  const extractRoutes = (app: any, basePath = '') => {
    if (app._router && app._router.stack) {
      app._router.stack.forEach((middleware: any) => {
        if (middleware.route) {
          // ルートが定義されている場合
          const path = basePath + middleware.route.path;
          const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
          routes.push({ path, methods });
        } else if (middleware.name === 'router' && middleware.handle.stack) {
          // サブルーターの場合
          const subPath = basePath + (middleware.regexp.source.replace(/\\/g, '').replace(/\^|\$/g, '').replace(/\(\?\:\/\)/g, '/') || '');
          middleware.handle.stack.forEach((handler: any) => {
            if (handler.route) {
              const path = subPath + handler.route.path;
              const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
              routes.push({ path, methods });
            }
          });
        }
      });
    }
  };
  
  // Express appからルートを抽出
  const app = req.app;
  extractRoutes(app);
  
  res.json({
    totalRoutes: routes.length,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path))
  });
});

// Auth関連のルートを確認するエンドポイント
router.get('/auth-routes', (req: Request, res: Response) => {
  const routes: any[] = [];
  
  const extractRoutes = (app: any, basePath = '') => {
    if (app._router && app._router.stack) {
      app._router.stack.forEach((middleware: any) => {
        if (middleware.route) {
          const path = basePath + middleware.route.path;
          const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
          if (path.includes('auth')) {
            routes.push({ path, methods });
          }
        } else if (middleware.name === 'router' && middleware.handle.stack) {
          const subPath = basePath + (middleware.regexp.source.replace(/\\/g, '').replace(/\^|\$/g, '').replace(/\(\?\:\/\)/g, '/') || '');
          middleware.handle.stack.forEach((handler: any) => {
            if (handler.route) {
              const path = subPath + handler.route.path;
              const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
              if (path.includes('auth')) {
                routes.push({ path, methods });
              }
            }
          });
        }
      });
    }
  };
  
  const app = req.app;
  extractRoutes(app);
  
  res.json({
    message: 'Auth routes found in the application',
    totalAuthRoutes: routes.length,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
    expectedVerifyEmailRoute: '/api/v1/auth/verify-email'
  });
});

export default router;