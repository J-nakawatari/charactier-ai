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

  // デバッグログ
  console.log('CSRF Verification:', {
    headerToken: headerToken ? 'present' : 'missing',
    cookieToken: cookieToken ? 'present' : 'missing',
    cookies: Object.keys(req.cookies || {}),
    headers: Object.keys(req.headers).filter(h => h.toLowerCase().includes('csrf'))
  });

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
      sameSite: 'lax', // strictからlaxに変更
      maxAge: 24 * 60 * 60 * 1000, // 24時間
      path: '/' // パスを明示的に設定
    });
  }

  next();
};

// CSRFトークンを取得するためのエンドポイントハンドラー
export const getCsrfToken = (req: Request, res: Response): void => {
  const existingToken = req.cookies[CSRF_COOKIE_NAME];
  const token = existingToken || generateCsrfToken();
  
  console.log('CSRF Token Endpoint:', {
    existingToken: existingToken ? 'present' : 'missing',
    newToken: !existingToken,
    secure: process.env.NODE_ENV === 'production'
  });
  
  if (!existingToken) {
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // strictからlaxに変更（クロスサイトGETリクエストでCookieを送信するため）
      maxAge: 24 * 60 * 60 * 1000,
      path: '/' // パスを明示的に設定
    });
  }

  res.json({ csrfToken: token });
};