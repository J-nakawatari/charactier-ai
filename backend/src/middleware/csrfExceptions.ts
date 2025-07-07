import { Request, Response, NextFunction } from 'express';
import { verifyCsrfToken } from './csrf';
import log from '../utils/logger';

/**
 * CSRF保護を除外するパス
 * - リフレッシュトークン: HttpOnly Cookieで保護されているため
 * - Webhook: 外部サービスからの呼び出しのため
 * - ヘルスチェック: 監視用エンドポイントのため
 */
const CSRF_EXCLUDED_PATHS = [
  '/api/v1/auth/refresh',
  '/api/v1/auth/admin/refresh',
  '/api/v1/webhook',
  '/webhook',
  '/api/v1/health',
  '/health',
  '/api/v1/csrf-token' // CSRFトークン取得エンドポイント自体
];

/**
 * APIクライアントかどうかを判定
 * - APIキーを使用している
 * - Bearer トークンを使用している（モバイルアプリ等）
 * - User-Agentがモバイルアプリを示している
 */
const isApiClient = (req: Request): boolean => {
  // APIキーヘッダー
  if (req.headers['x-api-key']) {
    return true;
  }
  
  // Bearerトークン（OAuth等）
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return true;
  }
  
  // モバイルアプリのUser-Agent
  const userAgent = req.headers['user-agent'] || '';
  const mobileAppPatterns = [
    /CharactierApp\/[\d.]+/i,  // 独自アプリ
    /okhttp/i,                  // Android
    /Alamofire/i,              // iOS
    /PostmanRuntime/i,          // 開発用
    /curl/i                     // CLI
  ];
  
  if (mobileAppPatterns.some(pattern => pattern.test(userAgent))) {
    return true;
  }
  
  return false;
};

/**
 * パスがCSRF保護除外対象かを判定
 */
const isExcludedPath = (path: string): boolean => {
  return CSRF_EXCLUDED_PATHS.some(excludedPath => {
    // 完全一致または前方一致
    return path === excludedPath || path.startsWith(excludedPath + '/');
  });
};

/**
 * 条件付きCSRF保護ミドルウェア
 * 除外条件に該当する場合はCSRF検証をスキップ
 */
export const conditionalCsrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // GETリクエストは常にスキップ（verifyCsrfToken内でも実装されているが念のため）
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  
  // 除外パスの場合
  if (isExcludedPath(req.path)) {
    log.debug('CSRF protection skipped - excluded path', {
      path: req.path,
      method: req.method
    });
    return next();
  }
  
  // APIクライアントの場合
  if (isApiClient(req)) {
    log.debug('CSRF protection skipped - API client detected', {
      path: req.path,
      method: req.method,
      hasApiKey: !!req.headers['x-api-key'],
      hasBearerToken: !!req.headers.authorization?.startsWith('Bearer '),
      userAgent: req.headers['user-agent']
    });
    return next();
  }
  
  // それ以外はCSRF検証を実行
  verifyCsrfToken(req, res, next);
};

/**
 * エラーハンドリング付きCSRF保護
 * より詳細なエラーメッセージを提供
 */
export const enhancedCsrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  conditionalCsrfProtection(req, res, (err?: any) => {
    if (err && err.message?.includes('CSRF')) {
      // より詳細なエラーレスポンス
      const isProduction = process.env.NODE_ENV === 'production';
      
      res.status(403).json({
        error: 'セキュリティトークンが無効です',
        message: isProduction 
          ? 'ページを更新してから再度お試しください。' 
          : 'CSRF token validation failed. Please refresh the page and try again.',
        code: 'CSRF_TOKEN_INVALID',
        ...(isProduction ? {} : {
          debug: {
            hasToken: !!req.headers['x-csrf-token'],
            hasCookie: !!req.cookies['XSRF-TOKEN'],
            path: req.path,
            method: req.method
          }
        })
      });
      return;
    }
    next(err);
  });
};