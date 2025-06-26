import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import log from '../utils/logger';
import { UserModel } from '../models/UserModel';
import { CharacterModel } from '../models/CharacterModel';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// レートリミッターを作成
const generalRateLimit = createRateLimiter('general');

// Debug endpoint to check authentication and cookies
router.get('/auth-status', generalRateLimit, (req: Request, res: Response) => {
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
router.get('/auth-test', generalRateLimit, authenticateToken, (req: AuthRequest, res: Response) => {
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
router.get('/admin/auth-test', generalRateLimit, authenticateToken, (req: AuthRequest, res: Response) => {
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
router.get('/routes', generalRateLimit, (req: Request, res: Response) => {
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
router.get('/auth-routes', generalRateLimit, (req: Request, res: Response) => {
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

// デバッグ用：親密度詳細情報取得
router.get('/affinity-details/:userId', generalRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    const user = await UserModel.findById(userId)
      .select('affinities')
      .populate({
        path: 'affinities.character',
        select: '_id name imageCharacterSelect themeColor galleryImages'
      })
      .lean();
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    // 各親密度の詳細情報を整形
    const detailedAffinities = (user.affinities || []).map((affinity: any) => {
      const unlockedImages = [];
      if (affinity.character && affinity.character.galleryImages) {
        // レベルに基づいて解放された画像を計算
        for (const image of affinity.character.galleryImages) {
          if (image.unlockLevel <= affinity.level) {
            unlockedImages.push(image);
          }
        }
      }
      
      return {
        characterId: affinity.character?._id || affinity.character,
        characterName: affinity.character?.name || 'Unknown',
        characterImage: affinity.character?.imageCharacterSelect || '/uploads/placeholder.png',
        themeColor: affinity.character?.themeColor || '#8B5CF6',
        level: affinity.level || 0,
        experience: affinity.experience || 0,
        experienceToNext: affinity.experienceToNext || 10,
        maxExperience: 100, // 固定値
        unlockedImagesCount: unlockedImages.length,
        unlockedImages: unlockedImages,
        nextUnlockLevel: Math.floor((affinity.level || 0) / 10 + 1) * 10,
        rawCharacterData: affinity.character
      };
    });
    
    res.json({
      userId,
      affinitiesCount: user.affinities?.length || 0,
      affinities: detailedAffinities
    });
    
  } catch (error) {
    console.error('Debug affinity details error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;