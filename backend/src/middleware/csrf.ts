import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// CSRFトークンを生成
export const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// CSRFトークンのCookie名
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// CSRFトークンを検証するミドルウェア（Double Submit Cookie Pattern）
export const verifyCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  // GETリクエストとHEADリクエストはスキップ
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // CSRFトークンをヘッダーから取得
  const headerToken = req.headers[CSRF_HEADER_NAME] as string || 
                     req.headers['X-CSRF-Token'] as string ||
                     req.body._csrf;

  // CookieからCSRFトークンを取得
  const cookieToken = req.cookies[CSRF_COOKIE_NAME];

  // トークンが存在し、一致するか確認
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    res.status(403).json({ 
      error: 'Invalid CSRF token',
      message: 'セキュリティトークンが無効です'
    });
    return;
  }

  next();
};

// CSRFトークンをCookieに設定するミドルウェア
export const setCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  // CSRFトークンがCookieにない場合は生成
  if (!req.cookies[CSRF_COOKIE_NAME]) {
    const token = generateCsrfToken();
    
    // CookieにCSRFトークンを設定
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // JavaScriptからアクセス可能にする
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24時間
    });
  }

  next();
};

// CSRFトークンを取得するためのエンドポイントハンドラー
export const getCsrfToken = (req: Request, res: Response): void => {
  const token = req.cookies[CSRF_COOKIE_NAME] || generateCsrfToken();
  
  if (!req.cookies[CSRF_COOKIE_NAME]) {
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });
  }

  res.json({ csrfToken: token });
};