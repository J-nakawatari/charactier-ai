import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel, IUser } from '../models/UserModel';

// JWT認証用の拡張Request型
export interface AuthRequest extends Request {
  user?: IUser;
}

// JWT認証ミドルウェア
export const authenticateToken = async (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    // Authorization ヘッダーから JWT を取得
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

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
    
    // ユーザー情報をデータベースから取得
    const user = await UserModel.findById(decoded.userId);
    
    if (!user) {
      res.status(401).json({ 
        error: 'User not found',
        message: 'ユーザーが見つかりません'
      });
      return;
    }

    // リクエストオブジェクトにユーザー情報を追加
    req.user = user;
    next();

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