import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel, IUser } from '../models/UserModel';
import { AdminModel, IAdmin } from '../models/AdminModel';

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
    // Authorization ヘッダーまたは x-auth-token ヘッダーから JWT を取得
    const authHeader = req.headers.authorization;
    const mockToken = req.headers['x-auth-token'] as string;
    
    let token: string | undefined;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]; // "Bearer TOKEN"
    } else if (mockToken) {
      token = mockToken; // 開発用モック認証
    }

    if (!token) {
      res.status(401).json({ 
        error: 'Access token required',
        message: 'アクセストークンが必要です'
      });
      return;
    }


    // JWT を検証
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET not configured');
      res.status(500).json({ 
        error: 'Authentication configuration error',
        message: '認証設定エラー'
      });
      return;
    }

    // トークンをデコード
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    console.log('🔍 JWT decoded userId:', decoded.userId);
    
    // まず管理者として検索
    const admin = await AdminModel.findById(decoded.userId);
    console.log('🔍 Admin found by userId:', admin ? `${admin.email} (${admin.role})` : 'null');
    if (admin && admin.isActive) {
      // 管理者として認証成功
      console.log('✅ Admin authentication successful, skipping user checks');
      req.admin = admin;
      // req.userに管理者情報とisAdminフラグを確実に設定
      req.user = {
        ...admin.toObject(),
        isAdmin: true,
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      } as unknown as IUser & { isAdmin: boolean; role: string };
      next();
      return;
    }
    
    console.log('🔍 Admin not found or inactive, checking as regular user');
    
    // 管理者で見つからない場合は一般ユーザーとして検索
    const user = await UserModel.findById(decoded.userId);
    console.log('🔍 User found by userId:', user ? `${user.email}` : 'null');
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
      next();
      return;
    }
    
    // どちらでも見つからない場合
    res.status(401).json({ 
      error: 'User not found',
      message: 'ユーザーが見つかりません'
    });

  } catch (error) {
    console.error('❌ JWT verification failed:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ 
        error: 'Invalid token',
        message: '無効なトークンです'
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        error: 'Token expired',
        message: 'トークンの有効期限が切れています'
      });
    } else {
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