import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel, IUser } from '../models/UserModel';
import { AdminModel, IAdmin } from '../models/AdminModel';
import log from '../utils/logger';

// JWT認証用の拡張Request型
export interface AuthRequest extends Request {
  user?: IUser & { isAdmin?: boolean; role?: string };
  admin?: IAdmin;
}

// 統一JWT認証ミドルウェア（ユーザーと管理者の両方対応）
export const authenticateToken = async (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    // 1. パスに基づいて適切なクッキーを選択
    // req.originalUrl を使用して完全なパスを確認（/api/v1/admin/...）
    const fullPath = req.originalUrl || req.url;
    const isAdminPath = fullPath.includes('/admin/');
    let token: string | undefined;
    
    // 管理者パスの場合は管理者用クッキー、それ以外はユーザー用クッキーを確認
    if (isAdminPath) {
      token = req.cookies?.adminAccessToken;
    } else {
      // ユーザーAPIの場合、ユーザートークンのみを使用（管理者トークンは使わない）
      token = req.cookies?.userAccessToken;
    }
    
    // 2. Cookieになければ、Authorization ヘッダーまたは x-auth-token ヘッダーから JWT を取得
    if (!token) {
      const authHeader = req.headers.authorization;
      const mockToken = req.headers['x-auth-token'] as string;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1]; // "Bearer TOKEN"
      } else if (mockToken) {
        token = mockToken; // 開発用モック認証
      }
    }
    
    // Comprehensive debug logging for production issues
    log.info('🔍 AUTH MIDDLEWARE DEBUG', {
      path: req.path,
      originalUrl: req.originalUrl,
      fullPath,
      method: req.method,
      isAdminPath,
      allCookies: req.cookies,
      cookieNames: Object.keys(req.cookies || {}),
      hasUserAccessToken: !!req.cookies?.userAccessToken,
      hasAdminAccessToken: !!req.cookies?.adminAccessToken,
      hasAuthHeader: !!req.headers.authorization,
      authHeaderValue: req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'none',
      selectedToken: token ? token.substring(0, 20) + '...' : 'none',
      tokenSource: token ? (req.cookies?.adminAccessToken ? 'adminCookie' : req.cookies?.userAccessToken ? 'userCookie' : 'authHeader') : 'none',
      origin: req.headers.origin,
      referer: req.headers.referer,
      userAgent: req.headers['user-agent']
    });

    if (!token) {
      log.warn('❌ NO TOKEN FOUND', { 
        path: req.path,
        originalUrl: req.originalUrl,
        fullPath,
        isAdminPath,
        cookieDebug: {
          hasCookieHeader: !!req.headers.cookie,
          cookieHeaderValue: req.headers.cookie,
          parsedCookies: req.cookies,
          adminTokenExists: !!req.cookies?.adminAccessToken,
          userTokenExists: !!req.cookies?.userAccessToken
        }
      });
      res.status(401).json({ 
        error: 'Access token required',
        message: 'アクセストークンが必要です',
        debug: process.env.NODE_ENV === 'development' ? {
          cookies: Object.keys(req.cookies || {}),
          headers: Object.keys(req.headers)
        } : undefined
      });
      return;
    }


    // JWT を検証
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      log.error('JWT_SECRET not configured', undefined);
      res.status(500).json({ 
        error: 'Authentication configuration error',
        message: '認証設定エラー'
      });
      return;
    }

    // トークンをデコード
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    log.info('✅ JWT DECODED SUCCESSFULLY', { 
      userId: decoded.userId,
      tokenSource: token === req.cookies?.adminAccessToken ? 'adminCookie' : 
                   token === req.cookies?.userAccessToken ? 'userCookie' : 'authHeader'
    });
    
    // 管理者パスの場合は管理者として検索
    if (isAdminPath) {
      const admin = await AdminModel.findById(decoded.userId);
      if (admin && admin.isActive) {
        // 管理者として認証成功
        log.info('✅ ADMIN AUTHENTICATED', {
          adminId: admin._id.toString(),
          email: admin.email,
          role: admin.role,
          path: req.path,
          originalUrl: req.originalUrl,
          fullPath
        });
        req.admin = admin;
        // 管理者パスでは req.user は設定しない
        next();
        return;
      } else if (admin && !admin.isActive) {
        log.warn('❌ INACTIVE ADMIN TRIED TO ACCESS', {
          adminId: admin._id.toString(),
          email: admin.email,
          path: req.path,
          originalUrl: req.originalUrl
        });
        res.status(403).json({ 
          error: 'Admin account inactive',
          message: '管理者アカウントが無効です'
        });
        return;
      } else {
        log.error('❌ ADMIN NOT FOUND', {
          userId: decoded.userId,
          path: req.path,
          originalUrl: req.originalUrl
        });
        res.status(401).json({ 
          error: 'Admin not found',
          message: '管理者が見つかりません'
        });
        return;
      }
    }
    
    // ユーザーパスの場合は一般ユーザーとして検索
    const user = await UserModel.findById(decoded.userId);
    if (user) {
      // アカウント状態チェック（停止・削除ユーザーのアクセス拒否）
      if (!user.isActive || user.accountStatus === 'suspended' || user.accountStatus === 'banned') {
        res.status(403).json({ 
          error: 'Account suspended',
          message: 'アカウントが停止されています。管理者にお問い合わせください。',
          accountStatus: user.accountStatus,
          forceLogout: true
        });
        return;
      }
      
      // 一般ユーザーとして認証成功
      req.user = user;
      log.info('✅ USER AUTHENTICATED', { 
        userId: user._id.toString(), 
        email: user.email,
        path: req.path,
        originalUrl: req.originalUrl,
        fullPath,
        isAdminPath
      });
      // 管理者パスへの一般ユーザーアクセスを警告
      if (isAdminPath) {
        log.warn('⚠️ REGULAR USER TRYING TO ACCESS ADMIN PATH', {
          userId: user._id.toString(),
          email: user.email,
          path: req.path,
          originalUrl: req.originalUrl,
          fullPath
        });
      }
      next();
      return;
    }
    
    // どちらでも見つからない場合
    log.error('❌ USER/ADMIN NOT FOUND', {
      userId: decoded.userId,
      path: req.path,
      originalUrl: req.originalUrl,
      isAdminPath
    });
    res.status(401).json({ 
      error: 'User not found',
      message: 'ユーザーが見つかりません'
    });

  } catch (error) {
    log.error('❌ JWT VERIFICATION FAILED', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      originalUrl: req.originalUrl
    });
    
    if (error instanceof jwt.JsonWebTokenError) {
      log.debug('Invalid token error', { message: error.message });
      res.status(401).json({ 
        error: 'Invalid token',
        message: '無効なトークンです',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      log.debug('Token expired error', {
        expiredAt: error.expiredAt,
        message: error.message
      });
      res.status(401).json({ 
        error: 'Token expired',
        message: 'トークンの有効期限が切れています',
        expiredAt: error.expiredAt
      });
    } else {
      log.error('Unknown authentication error', error);
      res.status(500).json({ 
        error: 'Authentication error',
        message: '認証エラーが発生しました'
      });
    }
  }
};

// mockAuth removed - using JWT authentication only

// JWT生成ヘルパー関数
export const generateAccessToken = (userId: string): string => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(
    { userId }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  );
};

// リフレッシュトークン生成ヘルパー関数
export const generateRefreshToken = (userId: string): string => {
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET not configured');
  }

  return jwt.sign(
    { userId }, 
    JWT_REFRESH_SECRET, 
    { expiresIn: '7d' }
  );
};

// Helper function to check if admin is moderator (read-only)
export const isModerator = (req: AuthRequest): boolean => {
  return req.admin?.role === 'moderator' || req.user?.role === 'moderator';
};

// Helper function to check if admin has write permissions
export const hasWritePermission = (req: AuthRequest): boolean => {
  // Only super_admin has write permissions
  return req.admin?.role === 'super_admin' || req.user?.role === 'super_admin';
};