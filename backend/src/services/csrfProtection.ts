import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import log from '../utils/logger';

interface CsrfOptions {
  cookie?: {
    httpOnly?: boolean;
    sameSite?: boolean | 'none' | 'lax' | 'strict';
    secure?: boolean;
    path?: string;
    domain?: string;
  };
  ignoreMethods?: string[];
  skipRoutes?: string[];
}

class CsrfProtection {
  private options: Required<CsrfOptions>;
  private tokenCache: Map<string, { token: string; timestamp: number }> = new Map();
  private readonly TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24時間

  constructor(options: CsrfOptions = {}) {
    this.options = {
      cookie: {
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        domain: process.env.COOKIE_DOMAIN,
        ...options.cookie
      },
      ignoreMethods: ['GET', 'HEAD', 'OPTIONS', ...(options.ignoreMethods || [])],
      skipRoutes: options.skipRoutes || []
    };
  }

  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  setTokenCookie(res: Response, token: string): void {
    const cookieOptions = {
      httpOnly: this.options.cookie.httpOnly,
      sameSite: this.options.cookie.sameSite as any,
      secure: this.options.cookie.secure,
      path: this.options.cookie.path,
      domain: this.options.cookie.domain,
      maxAge: this.TOKEN_EXPIRY
    };

    res.cookie('XSRF-TOKEN', token, cookieOptions);
  }

  getTokenFromRequest(req: Request): string | null {
    // ヘッダーから取得（優先）
    const headerToken = req.headers['x-csrf-token'] || 
                       req.headers['x-xsrf-token'] ||
                       req.headers['csrf-token'];
    
    if (headerToken) {
      return Array.isArray(headerToken) ? headerToken[0] : headerToken;
    }

    // ボディから取得
    if (req.body && req.body._csrf) {
      return req.body._csrf;
    }

    // クエリパラメータから取得（フォーム送信用）
    if (req.query._csrf) {
      const csrfQuery = req.query._csrf;
      if (typeof csrfQuery === 'string') {
        return csrfQuery;
      } else if (Array.isArray(csrfQuery) && csrfQuery.length > 0) {
        const firstItem = csrfQuery[0];
        return typeof firstItem === 'string' ? firstItem : null;
      }
    }

    return null;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // スキップするルートかチェック
      if (this.options.skipRoutes.some(route => req.path.startsWith(route))) {
        log.debug('CSRF protection skipped for route', { path: req.path });
        return next();
      }

      // GETリクエスト等はトークンを生成・設定するだけ
      if (this.options.ignoreMethods.includes(req.method.toUpperCase())) {
        // 既存のトークンがない場合は新規生成
        if (!req.cookies?.['XSRF-TOKEN']) {
          const token = this.generateToken();
          this.setTokenCookie(res, token);
          log.debug('CSRF token generated for GET request', { path: req.path });
        }
        return next();
      }

      // POST/PUT/DELETE等の検証
      const cookieToken = req.cookies?.['XSRF-TOKEN'];
      const requestToken = this.getTokenFromRequest(req);

      // デバッグログ追加
      log.info('CSRF validation check', {
        path: req.path,
        method: req.method,
        cookieToken: cookieToken ? cookieToken.substring(0, 10) + '...' : null,
        requestToken: requestToken ? requestToken.substring(0, 10) + '...' : null,
        headers: Object.keys(req.headers).filter(h => h.toLowerCase().includes('csrf') || h.toLowerCase().includes('xsrf'))
      });

      if (!cookieToken || !requestToken) {
        log.warn('CSRF validation failed: missing token', {
          path: req.path,
          method: req.method,
          hasCookieToken: !!cookieToken,
          hasRequestToken: !!requestToken,
          cookies: Object.keys(req.cookies || {}),
          headers: req.headers,
          ip: req.ip
        });
        res.status(403).json({
          error: 'CSRF token validation failed',
          message: 'セキュリティトークンが無効です'
        });
        return;
      }

      if (cookieToken !== requestToken) {
        log.warn('CSRF validation failed: token mismatch', {
          path: req.path,
          method: req.method,
          ip: req.ip
        });
        res.status(403).json({
          error: 'CSRF token validation failed',
          message: 'セキュリティトークンが一致しません'
        });
        return;
      }

      // トークンが有効な場合は続行
      next();
    };
  }
}

// シングルトンインスタンスを作成
const csrfProtectionInstance = new CsrfProtection({
  cookie: {
    httpOnly: false, // JavaScriptから読めるように
    sameSite: 'lax', // 動作確認後にstrictに変更可能
    secure: process.env.NODE_ENV === 'production'
  },
  skipRoutes: [
    '/api/v1/webhooks/stripe', // Stripe Webhook
    '/api/v1/notifications/stream', // SSE endpoints
    '/api/v1/health', // ヘルスチェック
    '/api/v1/debug', // デバッグエンドポイント
    '/api/v1/auth/login', // ログイン（CSRFトークン取得前）
    '/api/v1/auth/register', // 新規登録（CSRFトークン取得前）
    '/api/v1/auth/verify-email' // メール認証（外部リンクから）
  ]
});

// ミドルウェア関数を直接エクスポート
export const csrfProtection = csrfProtectionInstance.middleware();

export default csrfProtectionInstance;