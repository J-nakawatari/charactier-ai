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
      // 一時的に全てのリクエストをスキップ
      return next();
      
      // スキップするルートかチェック
      if (this.options.skipRoutes.some(route => req.path.startsWith(route))) {
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

      if (!cookieToken || !requestToken) {
        log.warn('CSRF validation failed: missing token', {
          path: req.path,
          method: req.method,
          hasCookieToken: !!cookieToken,
          hasRequestToken: !!requestToken,
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
    '/api/v1/webhooks', // 全てのWebhook
    '/api/v1/notifications/stream', // SSE endpoints
    '/api/v1/health', // ヘルスチェック
    '/api/v1/debug', // デバッグエンドポイント
    '/api/v1/auth', // 全ての認証エンドポイント（一時的）
    '/api/v1/admin', // 管理画面（一時的に無効化）
    '/api/v1/tokens/purchase', // トークン購入（一時的）
    '/api/v1/stripe' // Stripe関連（一時的）
  ]
});

// ミドルウェア関数を直接エクスポート
export const csrfProtection = csrfProtectionInstance.middleware();

export default csrfProtectionInstance;