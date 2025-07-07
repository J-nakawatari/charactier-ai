import type { AuthRequest } from '../types/express';
import { generateEmailVerificationHTML } from '../utils/emailTemplates';
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import escapeHtml from 'escape-html';
import { UserModel } from '../models/UserModel';
import { AdminModel } from '../models/AdminModel';
import { generateAccessToken, generateRefreshToken, authenticateToken } from '../middleware/auth';
import { sendVerificationEmail, generateVerificationToken, isDisposableEmail } from '../utils/sendEmail';
import { registrationRateLimit, consumeRegistrationLimit } from '../middleware/registrationLimit';
import { createRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validation';
import { verifyCsrfToken } from '../middleware/csrf';
import { authSchemas } from '../validation/schemas';
import log from '../utils/logger';
import { sendErrorResponse, ClientErrorCode, mapErrorToClientCode } from '../utils/errorResponse';
import { hashPassword, verifyPassword, needsRehash, validatePasswordStrength } from '../services/passwordHash';
import { getCookieConfig, getRefreshCookieConfig, getFeatureFlags } from '../config/featureFlags';
import { generateCompactAccessToken, generateCompactRefreshToken, CompactTokenPayload, verifyCompactToken } from '../utils/jwtUtils';
import { 
  COOKIE_NAMES,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  clearAllAuthCookies,
  clearUserAuthCookies,
  clearAdminAuthCookies,
  estimateCookieSize,
  COOKIE_SIZE_WARNING_THRESHOLD
} from '../config/cookieConfig';

const router: Router = Router();

// レートリミッターを作成
const generalRateLimit = createRateLimiter('general');
const authRateLimit = createRateLimiter('auth');

// Helper function to safely get locale
function getSafeLocale(locale: string | undefined): 'ja' | 'en' {
  return locale === 'ja' ? 'ja' : 'en';
}

// Helper function to generate email verification HTML response
// XSS脆弱性のため、この関数は使用しない（emailTemplates.tsを使用）
/*
function generateEmailVerificationHTML_DEPRECATED(
  type: 'success' | 'error' | 'already-verified' | 'expired' | 'server-error',
  locale: 'ja' | 'en',
  userData?: {
    userInfo?: any;
    accessToken?: string;
    refreshToken?: string;
    frontendUrl?: string;
  }
): string {
  const messages = {
    success: {
      title: locale === 'ja' ? '認証完了！' : 'Verified!',
      message: locale === 'ja' ? 'メールアドレスが確認されました。' : 'Your email has been verified successfully.',
      buttonText: locale === 'ja' ? '今すぐセットアップを開始' : 'Start Setup Now',
      redirectMessage: locale === 'ja' ? '3秒後にセットアップ画面に移動します...' : 'Redirecting to setup in 3 seconds...',
      iconColor: '#10b981'
    },
    error: {
      title: locale === 'ja' ? 'エラー' : 'Error',
      message: locale === 'ja' ? '無効なリクエストです。' : 'Invalid request.',
      buttonText: locale === 'ja' ? 'ホームに戻る' : 'Back to Home',
      iconColor: '#f59e0b'
    },
    'already-verified': {
      title: locale === 'ja' ? '認証済み' : 'Already Verified',
      message: locale === 'ja' ? 'このメールアドレスは既に認証されています。' : 'This email address has already been verified.',
      buttonText: locale === 'ja' ? 'セットアップページへ' : 'Go to Setup',
      iconColor: '#f59e0b'
    },
    expired: {
      title: locale === 'ja' ? '認証エラー' : 'Verification Error',
      message: locale === 'ja' ? 'リンクが無効か、有効期限が切れています。' : 'The link is invalid or has expired.',
      buttonText: locale === 'ja' ? '新規登録画面へ' : 'Back to Registration',
      iconColor: '#ef4444'
    },
    'server-error': {
      title: locale === 'ja' ? 'サーバーエラー' : 'Server Error',
      message: locale === 'ja' ? '申し訳ございません。エラーが発生しました。時間をおいて再度お試しください。' : 'Sorry, an error occurred. Please try again later.',
      buttonText: locale === 'ja' ? 'ホームに戻る' : 'Back to Home',
      iconColor: '#6b7280'
    }
  };

  const config = messages[type];
  const frontendUrl = userData?.frontendUrl || process.env.FRONTEND_URL || (
    process.env.NODE_ENV === 'production' 
      ? 'https://charactier-ai.com' 
      : 'http://localhost:3000'
  );

  const successScript = type === 'success' && userData ? `
    <script>
      // ユーザー情報とトークンをlocalStorageに保存
      (function() {
        try {
          // ユーザー情報を保存
          localStorage.setItem('user', JSON.stringify(${JSON.stringify(userData.userInfo)}));
          localStorage.setItem('accessToken', '${userData.accessToken}');
          localStorage.setItem('refreshToken', '${userData.refreshToken}');
          // User data saved to localStorage
        } catch (error) {
          // Failed to save user data
        }
      })();
      
      // 3秒後にリダイレクト
      window.onload = function() {
        setTimeout(function() {
          window.location.href = '${frontendUrl}/${locale}/setup';
        }, 3000);
      };
    </script>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(config.title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Hiragino Sans', 'Noto Sans JP', sans-serif;
      background: linear-gradient(to bottom right, #f3e8ff, #dbeafe);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      padding: 32px;
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    .icon-wrapper {
      width: 80px;
      height: 80px;
      background-color: ${config.iconColor};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon {
      width: 40px;
      height: 40px;
      fill: white;
    }
    h1 {
      color: #1f2937;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .message {
      color: #4b5563;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .button {
      display: inline-block;
      background-color: #7c3aed;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    .button:hover {
      background-color: #6d28d9;
    }
    .redirect-message {
      color: #6b7280;
      font-size: 14px;
      margin-top: 16px;
    }
    .error-box {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .error-text {
      color: #dc2626;
      font-size: 14px;
    }
    .button-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .button-primary {
      background-color: #7c3aed;
      color: white;
    }
    .button-primary:hover {
      background-color: #6d28d9;
    }
    .button-secondary {
      background-color: #f3f4f6;
      color: #374151;
    }
    .button-secondary:hover {
      background-color: #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon-wrapper">
      ${type === 'success' ? `
      <svg class="icon" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
      ` : type === 'expired' ? `
      <svg class="icon" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
      </svg>
      ` : type === 'server-error' ? `
      <svg class="icon" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
      </svg>
      ` : `
      <svg class="icon" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      `}
    </div>
    <h1>${escapeHtml(config.title)}</h1>
    <p class="message">
      ${escapeHtml(config.message)}
    </p>
    ${type === 'expired' ? `
    <div class="error-box">
      <p class="error-text">
        ${locale === 'ja' ? 'リンクの有効期限は24時間です。' : 'Verification links are valid for 24 hours.'}
      </p>
    </div>
    <div class="button-group">
      <a href="/${locale}/register" class="button button-primary">
        ${escapeHtml(config.buttonText)}
      </a>
      <a href="/${locale}/login" class="button button-secondary">
        ${locale === 'ja' ? 'ログイン画面へ' : 'Go to Login'}
      </a>
    </div>
    ` : `
    <a href="${type === 'success' ? `${frontendUrl}/${locale}/setup` : type === 'already-verified' ? `/${locale}/setup` : `/${locale}`}" class="button">
      ${escapeHtml(config.buttonText)}
    </a>
    `}
    ${type === 'success' && 'redirectMessage' in config ? `<p class="redirect-message">${escapeHtml(config.redirectMessage)}</p>` : ''}
  </div>
  ${successScript}
</body>
</html>`;
}
*/

// ユーザー登録（メール認証付き）
router.post('/register', 
  registrationRateLimit, 
  verifyCsrfToken,
  validate({ body: authSchemas.register }),
  async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, locale = 'ja' } = req.body;

    // 使い捨てメールアドレスのチェック
    if (isDisposableEmail(email)) {
      sendErrorResponse(res, 400, ClientErrorCode.INVALID_INPUT);
      return;
    }

    // メールアドレスの重複チェック（アクティブユーザーのみ）
    const existingUser = await UserModel.findOne({ 
      email: { $eq: email }, 
      isActive: { $ne: false } 
    });
    if (existingUser) {
      log.warn('Registration attempt with existing email', { email });
      sendErrorResponse(res, 409, ClientErrorCode.ALREADY_EXISTS);
      return;
    }

    // パスワード強度チェック
    const passwordStrength = validatePasswordStrength(password);
    if (!passwordStrength.isValid) {
      sendErrorResponse(res, 400, ClientErrorCode.INVALID_INPUT, {
        errors: passwordStrength.errors
      });
      return;
    }

    // パスワードをハッシュ化（Argon2id）
    const hashedPassword = await hashPassword(password);

    // メール認証トークンを生成
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後

    // 新規ユーザーを作成（メール未認証状態）
    const newUser = new UserModel({
      name: '', // セットアップ画面で設定予定
      email,
      password: hashedPassword,
      preferredLanguage: locale,
      tokenBalance: 0, // メール認証後に付与
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      isActive: true,
      isSetupComplete: false // 初回セットアップ未完了
    });

    const savedUser = await newUser.save();
    log.info('New user registered (pending verification)', { userId: savedUser._id.toString(), email: savedUser.email });

    // 認証メールを送信
    try {
      await sendVerificationEmail(email, verificationToken, locale as 'ja' | 'en');
      log.info('Verification email sent successfully', { email });
    } catch (emailError) {
      log.error('Failed to send verification email', emailError, { email });
      // エラーの詳細をログに出力
      if (emailError instanceof Error) {
        log.error('Email error details', emailError, { 
          message: emailError.message,
          stack: emailError.stack 
        });
      }
      // メール送信に失敗してもユーザー登録は続行（セキュリティのため）
    }

    // 登録成功時にレート制限をカウント
    const clientIP = (req as any).clientIP;
    if (clientIP) {
      await consumeRegistrationLimit(clientIP);
    }

    // レスポンス（トークンは返さない）
    res.status(201).json({
      message: locale === 'ja' 
        ? '確認メールを送信しました。メールをご確認ください。' 
        : 'Verification email sent. Please check your email.',
      emailSent: true
    });

  } catch (error) {
    const errorCode = mapErrorToClientCode(error);
    sendErrorResponse(res, 500, errorCode, error);
  }
});

// ユーザーログイン
router.post('/login', 
  authRateLimit,
  verifyCsrfToken,
  validate({ body: authSchemas.login }),
  async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // ユーザーを検索
    const user = await UserModel.findOne({ email: { $eq: email } });
    if (!user) {
      log.warn('Login attempt with non-existent email', { email });
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
    }

    // パスワードを確認（Argon2id/bcrypt両対応）
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      log.warn('Login attempt with invalid password', { email, userId: user._id.toString() });
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
    }

    // パスワードハッシュの移行が必要な場合
    if (needsRehash(user.password)) {
      try {
        const newHash = await hashPassword(password);
        await UserModel.findByIdAndUpdate(user._id, { $set: { password: newHash } });
        log.info('Password hash migrated to Argon2id', { userId: user._id.toString() });
      } catch (migrationError) {
        log.error('Password hash migration failed', migrationError);
        // 移行に失敗してもログインは続行
      }
    }

    // アクティブユーザーかチェック
    if (!user.isActive) {
      log.warn('Login attempt with deactivated account', { email, userId: user._id.toString() });
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS);
      return;
    }

    // メール認証チェック
    if (!user.emailVerified) {
      log.warn('Login attempt with unverified email', { email, userId: user._id.toString() });
      // Special response for email verification status
      res.status(403).json({
        error: ClientErrorCode.AUTH_FAILED,
        message: 'メールアドレスが認証されていません。確認メールをご確認ください。',
        emailNotVerified: true
      });
      return;
    }

    // コンパクトなJWTトークンを生成
    const accessToken = generateCompactAccessToken(user._id.toString(), 'user', '2h');
    const refreshToken = generateCompactRefreshToken(user._id.toString(), 'user', '7d');

    log.info('User logged in', { userId: user._id.toString(), email: user.email });
    log.debug('User login details', {
      userId: user._id.toString(),
      fields: Object.keys(user.toObject()),
      isSetupComplete: user.isSetupComplete,
      isSetupCompleteType: typeof user.isSetupComplete
    });

    // Feature Flag取得
    const flags = getFeatureFlags();

    // ユーザー用の古いCookieを削除（管理者クッキーは削除しない）
    clearUserAuthCookies(res);

    // 新しいCookie設定
    const isProduction = process.env.NODE_ENV === 'production';
    const accessCookieOptions = getAccessTokenCookieOptions(isProduction);
    const refreshCookieOptions = getRefreshTokenCookieOptions(isProduction);
    
    // Cookieにトークンを設定（ユーザー用）
    res.cookie(COOKIE_NAMES.USER_ACCESS, accessToken, accessCookieOptions);
    res.cookie(COOKIE_NAMES.USER_REFRESH, refreshToken, refreshCookieOptions);
    
    // Cookieサイズの確認
    const cookieSize = estimateCookieSize({
      [COOKIE_NAMES.USER_ACCESS]: accessToken,
      [COOKIE_NAMES.USER_REFRESH]: refreshToken,
      [COOKIE_NAMES.CSRF_TOKEN]: req.cookies?.[COOKIE_NAMES.CSRF_TOKEN] || ''
    });
    
    if (cookieSize > COOKIE_SIZE_WARNING_THRESHOLD) {
      log.warn('Cookie size exceeds warning threshold', {
        userId: user._id.toString(),
        cookieSize,
        threshold: COOKIE_SIZE_WARNING_THRESHOLD
      });
    }
    
    // ログイン成功レスポンス
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      tokenBalance: user.tokenBalance,
      isSetupComplete: user.isSetupComplete
    };
    
    log.debug('Sending user response', { userId: user._id.toString(), isSetupComplete: userResponse.isSetupComplete });
    
    // レスポンス（Feature Flag対応）
    if (flags.SECURE_COOKIE_AUTH) {
      // 新方式: トークンをレスポンスに含めない
      res.json({
        message: 'ログインしました',
        user: userResponse
      });
    } else {
      // 従来方式: トークンをレスポンスに含める
      res.json({
        message: 'ログインしました',
        user: userResponse,
        tokens: {
          accessToken,
          refreshToken
        }
      });
    }

  } catch (error) {
    const errorCode = mapErrorToClientCode(error);
    sendErrorResponse(res, 500, errorCode, error);
  }
});

// トークンリフレッシュ（Feature Flag対応）
router.post('/refresh', 
  authRateLimit,
  validate({ body: authSchemas.refreshToken }),
  async (req: Request, res: Response): Promise<void> => {
  try {
    const flags = getFeatureFlags();
    
    // Feature Flagに基づいてリフレッシュトークンの取得方法を切り替え
    let refreshToken: string | undefined;
    
    if (flags.SECURE_COOKIE_AUTH) {
      // 新方式: HttpOnly Cookieから取得（ボディからは取得しない）
      // ユーザー用のリフレッシュエンドポイントなので、adminRefreshTokenは除外
      refreshToken = req.cookies?.refreshToken || req.cookies?.userRefreshToken;
      
      if (!refreshToken) {
        log.warn('No refresh token found in cookies');
        sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
        return;
      }
    } else {
      // 従来方式: Cookieまたはボディから取得
      // ユーザー用のリフレッシュエンドポイントなので、adminRefreshTokenは除外
      refreshToken = req.cookies?.refreshToken || req.cookies?.userRefreshToken || req.body.refreshToken;
    }

    // リフレッシュトークンを検証
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!JWT_REFRESH_SECRET) {
      log.error('JWT secret not configured');
      sendErrorResponse(res, 500, ClientErrorCode.SERVICE_UNAVAILABLE);
      return;
    }

    // コンパクトトークンの場合、idフィールドをuserIdにマッピング
    let decoded: any;
    try {
      decoded = verifyCompactToken(refreshToken, true);
      // コンパクトトークンの場合、idフィールドをuserIdにマッピング
      if (decoded.id) {
        decoded.userId = decoded.id;
      }
    } catch {
      // 従来形式のトークンとして検証
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
    }

    // ユーザー専用のリフレッシュエンドポイントなので、ユーザーのみを検索
    const user = await UserModel.findById(decoded.userId);
    if (!user || !user.isActive) {
      log.warn('Token refresh failed - user not found or inactive', { userId: decoded.userId });
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
    }

    // 新しいアクセストークンを生成（コンパクト版を使用）
    const newAccessToken = generateCompactAccessToken(user._id.toString(), 'user', '2h');
    
    // Cookie設定
    const isProduction = process.env.NODE_ENV === 'production';
    const accessCookieOptions = getAccessTokenCookieOptions(isProduction);
    
    // ユーザー用クッキー名で設定
    res.cookie(COOKIE_NAMES.USER_ACCESS, newAccessToken, accessCookieOptions);

    // レスポンス（Feature Flag対応）
    if (flags.SECURE_COOKIE_AUTH) {
      // 新方式: トークンをレスポンスに含めない
      res.json({
        success: true,
        message: 'トークンが更新されました'
      });
    } else {
      // 従来方式: トークンをレスポンスに含める
      res.json({
        accessToken: newAccessToken
      });
    }

  } catch (error) {
    log.error('Token refresh error', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      log.warn('Refresh token expired', {
        expiredAt: error.expiredAt,
        message: error.message
      });
      res.status(401).json({
        error: ClientErrorCode.TOKEN_EXPIRED,
        message: 'リフレッシュトークンの有効期限が切れています。再度ログインしてください。',
        requireRelogin: true
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      log.warn('Invalid refresh token', { message: error.message });
      res.status(401).json({
        error: ClientErrorCode.AUTH_FAILED,
        message: '無効なリフレッシュトークンです',
        requireRelogin: true
      });
    } else {
      const errorCode = mapErrorToClientCode(error);
      sendErrorResponse(res, 500, errorCode, error);
    }
  }
});

// ユーザープロフィール更新
router.put('/user/profile', 
  generalRateLimit,
  authenticateToken,
  validate({ body: authSchemas.updateProfile }),
  async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    // JWTからユーザーIDを取得（authenticateTokenミドルウェアで設定）
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    if (!userId) {
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
    }

    // ユーザー情報を更新
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { name: name.trim() } },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      log.warn('Profile update failed - user not found', { userId });
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND);
      return;
    }

    log.info('Profile updated', { userId: updatedUser._id.toString(), name: updatedUser.name });

    res.json({
      success: true,
      message: 'プロフィールを更新しました',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        tokenBalance: updatedUser.tokenBalance,
        isSetupComplete: updatedUser.isSetupComplete
      }
    });

  } catch (error) {
    const errorCode = mapErrorToClientCode(error);
    sendErrorResponse(res, 500, errorCode, error);
  }
});

// 初回セットアップ完了
router.post('/user/setup-complete', generalRateLimit, authenticateToken, verifyCsrfToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, selectedCharacterId } = req.body;

    if (!name || name.trim().length === 0) {
      sendErrorResponse(res, 400, ClientErrorCode.MISSING_REQUIRED_FIELD);
      return;
    }

    if (!selectedCharacterId) {
      sendErrorResponse(res, 400, ClientErrorCode.MISSING_REQUIRED_FIELD);
      return;
    }

    // JWTからユーザーIDを取得
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    if (!userId) {
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
    }

    // ユーザー情報を更新（名前、選択キャラ、セットアップ完了フラグ）
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { 
        $set: {
          name: name.trim(),
          selectedCharacter: selectedCharacterId,
          isSetupComplete: true,
          tokenBalance: 10000 // 初回セットアップ完了ボーナス
        }
      },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      log.warn('Setup completion failed - user not found', { userId });
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND);
      return;
    }

    log.info('Setup completed', { 
      userId: updatedUser._id.toString(), 
      name: updatedUser.name,
      selectedCharacter: selectedCharacterId,
      tokenBonus: 10000
    });

    res.json({
      success: true,
      message: 'セットアップが完了しました',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        tokenBalance: updatedUser.tokenBalance,
        selectedCharacter: updatedUser.selectedCharacter,
        isSetupComplete: updatedUser.isSetupComplete
      }
    });

  } catch (error) {
    const errorCode = mapErrorToClientCode(error);
    sendErrorResponse(res, 500, errorCode, error);
  }
});

// メールアドレス認証
router.get('/verify-email', generalRateLimit, async (req: Request, res: Response): Promise<void> => {
  // URLパラメータを取得（SendGridのエンコーディング問題対策）
  let { token, locale = 'ja' } = req.query;
  
  // もしlocaleがundefinedまたは文字列でない場合、req.pathから取得を試みる
  // これは&amp;がエンコードされた場合の対策
  if (!locale && req.originalUrl) {
    const match = req.originalUrl.match(/locale=([^&]+)/);
    if (match) {
      locale = match[1];
    }
  }
  
  try {
    // ログ出力でデバッグ
    log.info('Email verification request', {
      originalUrl: req.originalUrl,
      queryParams: req.query,
      token: token ? token.toString().substring(0, 10) + '...' : 'missing',
      locale: locale
    });

    if (!token || typeof token !== 'string') {
      // エラーページをHTMLで返す
      res.status(400).send(generateEmailVerificationHTML('error', getSafeLocale(locale as string)));
      return;
    }

    // トークンでユーザーを検索（selectでトークンフィールドを含める）
    const user = await UserModel.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      log.warn('Email verification failed - invalid or expired token', { token });
      res.status(404).send(generateEmailVerificationHTML('expired', getSafeLocale(locale as string)));
      return;
    }

    // 既に認証済みの場合
    if (user.emailVerified) {
      log.info('Email verification attempt for already verified user', { userId: user._id.toString() });
      // 認証済みの場合はセットアップページへリダイレクト
      const frontendUrl = process.env.FRONTEND_URL || (
        process.env.NODE_ENV === 'production' 
          ? 'https://charactier-ai.com' 
          : 'http://localhost:3000'
      );
      const safeLocale = getSafeLocale(locale as string);
      res.redirect(`${frontendUrl}/${safeLocale}/setup`);
      return;
    }

    // メールアドレスを認証済みに更新
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    
    // メール認証時のトークン付与を削除（セットアップ完了時に付与するため）

    await user.save();

    // JWTトークンを生成（コンパクト版を使用）
    const accessToken = generateCompactAccessToken(user._id.toString(), 'user', '2h');
    const refreshToken = generateCompactRefreshToken(user._id.toString(), 'user', '7d');
    
    // Cookie設定（Feature Flag対応）
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = getCookieConfig(isProduction);
    const refreshCookieOptions = getRefreshCookieConfig(isProduction);
    
    // ドメインを追加（必要な場合）
    const cookieDomain = process.env.COOKIE_DOMAIN || (isProduction ? '.charactier-ai.com' : undefined);
    if (cookieDomain) {
      cookieOptions.domain = cookieDomain;
      refreshCookieOptions.domain = cookieDomain;
    }
    
    // Cookieにトークンを設定（ユーザー用）
    res.cookie('userAccessToken', accessToken, cookieOptions);
    res.cookie('userRefreshToken', refreshToken, refreshCookieOptions);

    log.info('Email verified successfully', { email: user.email, userId: user._id.toString() });

    // ユーザー情報を準備
    const userInfo = {
      _id: user._id,
      name: user.name,
      email: user.email,
      tokenBalance: user.tokenBalance,
      isSetupComplete: user.isSetupComplete
    };

    // 成功ページを表示して、自動的にセットアップページへリダイレクト
    const frontendUrl = process.env.FRONTEND_URL || (
      process.env.NODE_ENV === 'production' 
        ? 'https://charactier-ai.com' 
        : 'http://localhost:3000'
    );
    
    const html = generateEmailVerificationHTML('success', getSafeLocale(locale as string), {
      userInfo,
      accessToken,
      refreshToken,
      frontendUrl
    });
    
    // デバッグ: 生成されたHTMLの一部をログ出力
    log.debug('Generated email verification HTML preview', {
      buttonUrlSnippet: html.match(/href="([^"]+)"/)?.[1] || 'not found',
      redirectUrlSnippet: html.match(/window\.location\.href = '([^']+)'/)?.[1] || 'not found'
    });
    
    res.send(html);

  } catch (error) {
    const errorCode = mapErrorToClientCode(error);
    log.error('Email verification error', error);
    res.status(500).send(generateEmailVerificationHTML('server-error', getSafeLocale(locale as string)));
  }
});

// 認証メール再送信
router.post('/resend-verification', registrationRateLimit, verifyCsrfToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, locale = 'ja' } = req.body;

    if (!email) {
      sendErrorResponse(res, 400, ClientErrorCode.MISSING_REQUIRED_FIELD);
      return;
    }

    const user = await UserModel.findOne({ email: { $eq: email } }).select('+emailVerificationToken +emailVerificationExpires');
    
    if (!user) {
      // セキュリティ上、ユーザーが存在しない場合も成功したように見せる
      res.json({
        message: locale === 'ja' 
          ? '確認メールを再送信しました' 
          : 'Verification email resent'
      });
      return;
    }

    if (user.emailVerified) {
      log.info('Verification resend attempt for already verified user', { email });
      sendErrorResponse(res, 400, ClientErrorCode.ALREADY_EXISTS);
      return;
    }

    // 新しいトークンを生成
    const newToken = generateVerificationToken();
    const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = newToken;
    user.emailVerificationExpires = newExpires;
    await user.save();

    // メール送信
    try {
      await sendVerificationEmail(email, newToken, locale as 'ja' | 'en');
      log.info('Verification email resent successfully', { email });
    } catch (emailError) {
      log.error('Failed to resend verification email', emailError, { email });
    }

    res.json({
      message: locale === 'ja' 
        ? '確認メールを再送信しました' 
        : 'Verification email resent'
    });

  } catch (error) {
    const errorCode = mapErrorToClientCode(error);
    sendErrorResponse(res, 500, errorCode, error);
  }
});

// 管理者ログイン
router.post('/admin/login', authRateLimit, verifyCsrfToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // バリデーション
    if (!email || !password) {
      sendErrorResponse(res, 400, ClientErrorCode.MISSING_REQUIRED_FIELD);
      return;
    }

    // AdminModelから管理者を検索
    const admin = await AdminModel.findOne({ email: { $eq: email } });
    if (!admin) {
      log.warn('Admin login attempt with non-existent email', { email });
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
    }

    // アクティブ管理者かチェック
    if (!admin.isActive) {
      log.warn('Admin login attempt with deactivated account', { email, adminId: admin._id.toString() });
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS);
      return;
    }

    // パスワード検証（Argon2id/bcrypt両対応）
    const isValidPassword = await verifyPassword(password, admin.password);
    if (!isValidPassword) {
      log.warn('Admin login attempt with invalid password', { email, adminId: admin._id.toString() });
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
    }
    
    // パスワードハッシュの移行が必要な場合
    if (needsRehash(admin.password)) {
      try {
        const newHash = await hashPassword(password);
        await AdminModel.findByIdAndUpdate(admin._id, { $set: { password: newHash } });
        log.info('Admin password hash migrated to Argon2id', { adminId: admin._id.toString() });
      } catch (migrationError) {
        log.error('Admin password hash migration failed', migrationError);
        // 移行に失敗してもログインは続行
      }
    }

    // ログイン日時を更新
    admin.lastLogin = new Date();
    await admin.save();

    // コンパクトなJWTトークン生成（管理者専用）
    const adminId = admin._id as string;
    const accessToken = generateCompactAccessToken(adminId.toString(), 'admin', '2h');
    const refreshToken = generateCompactRefreshToken(adminId.toString(), 'admin', '7d');
    
    // Feature Flag取得
    const flags = getFeatureFlags();
    
    // 管理者用の古いCookieを削除（ユーザークッキーは削除しない）
    clearAdminAuthCookies(res);
    
    // 新しいCookie設定
    const isProduction = process.env.NODE_ENV === 'production';
    const accessCookieOptions = getAccessTokenCookieOptions(isProduction);
    const refreshCookieOptions = getRefreshTokenCookieOptions(isProduction);
    
    // Cookieにトークンを設定（管理者用）
    res.cookie(COOKIE_NAMES.ADMIN_ACCESS, accessToken, accessCookieOptions);
    res.cookie(COOKIE_NAMES.ADMIN_REFRESH, refreshToken, refreshCookieOptions);
    
    // Cookieサイズの確認
    const cookieSize = estimateCookieSize({
      [COOKIE_NAMES.ADMIN_ACCESS]: accessToken,
      [COOKIE_NAMES.ADMIN_REFRESH]: refreshToken,
      [COOKIE_NAMES.CSRF_TOKEN]: req.cookies?.[COOKIE_NAMES.CSRF_TOKEN] || ''
    });
    
    if (cookieSize > COOKIE_SIZE_WARNING_THRESHOLD) {
      log.warn('Admin cookie size exceeds warning threshold', {
        adminId: admin._id.toString(),
        cookieSize,
        threshold: COOKIE_SIZE_WARNING_THRESHOLD
      });
    }

    log.info('Admin login successful', { adminId: admin._id.toString(), email: admin.email, role: admin.role });

    // レスポンス（Feature Flag対応）
    if (flags.SECURE_COOKIE_AUTH) {
      // 新方式: トークンをレスポンスに含めない
      res.status(200).json({
        message: '管理者ログインが成功しました',
        user: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          isAdmin: true // フロントエンド互換性のため
        },
        featureFlags: flags // フロントエンドで認証方式を判定するため
      });
    } else {
      // 従来方式: トークンをレスポンスに含める
      res.status(200).json({
        message: '管理者ログインが成功しました',
        tokens: {
          accessToken,
          refreshToken
        },
        user: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          isAdmin: true // フロントエンド互換性のため
        },
        featureFlags: flags // フロントエンドで認証方式を判定するため
      });
    }

  } catch (error) {
    const errorCode = mapErrorToClientCode(error);
    sendErrorResponse(res, 500, errorCode, error);
  }
});

// トークン検証
router.get('/verify-token', authRateLimit, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
    }
    
    res.json({
      valid: true,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        tokenBalance: req.user.tokenBalance,
        isSetupComplete: req.user.isSetupComplete,
        isAdmin: req.user.isAdmin || false
      }
    });
  } catch (error) {
    const errorCode = mapErrorToClientCode(error);
    sendErrorResponse(res, 500, errorCode, error);
  }
});

// ログアウト
router.post('/logout', generalRateLimit, verifyCsrfToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // ユーザー認証関連Cookieのみクリア
    clearUserAuthCookies(res);
    
    res.json({
      success: true,
      message: 'ログアウトしました'
    });
  } catch (error) {
    const errorCode = mapErrorToClientCode(error);
    sendErrorResponse(res, 500, errorCode, error);
  }
});

// 管理者ログアウト
router.post('/admin/logout', generalRateLimit, verifyCsrfToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // 管理者認証関連Cookieのみクリア
    clearAdminAuthCookies(res);
    
    log.info('Admin logout successful');
    
    res.json({
      success: true,
      message: '管理者ログアウトしました'
    });
  } catch (error) {
    const errorCode = mapErrorToClientCode(error);
    sendErrorResponse(res, 500, errorCode, error);
  }
});

// 管理者作成（開発用）
router.post('/create-admin', authRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const adminEmail = 'newadmin@charactier.ai';
    const adminPassword = 'NewSecureAdmin2024';

    // 既存の管理者をチェック
    const existingAdmin = await AdminModel.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      res.json({
        message: '管理者は既に存在します',
        email: adminEmail,
        isExisting: true
      });
      return;
    }

    // パスワードをハッシュ化（Argon2id）
    const hashedPassword = await hashPassword(adminPassword);

    // 管理者を作成
    const adminUser = new AdminModel({
      name: '新しい管理者',
      email: adminEmail,
      password: hashedPassword,
      role: 'super_admin',
      isActive: true
    });

    await adminUser.save();
    log.info('Admin user created successfully', { email: adminEmail });

    res.status(201).json({
      message: '管理者を作成しました',
      email: adminEmail,
      password: adminPassword,
      isNew: true
    });

  } catch (error) {
    const errorCode = mapErrorToClientCode(error);
    sendErrorResponse(res, 500, errorCode, error);
  }
});

// 管理者トークンリフレッシュ（Feature Flag対応）
router.post('/admin/refresh', authRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const flags = getFeatureFlags();
    
    // Feature Flagに基づいてリフレッシュトークンの取得方法を切り替え
    let refreshToken: string | undefined;
    
    if (flags.SECURE_COOKIE_AUTH) {
      // 新方式: HttpOnly Cookieから取得（ボディからは取得しない）
      refreshToken = req.cookies?.adminRefreshToken;
    } else {
      // 従来方式: Cookieまたはボディから取得
      refreshToken = req.cookies?.adminRefreshToken || req.body.refreshToken;
    }

    if (!refreshToken) {
      log.warn('Admin refresh token missing');
      res.status(401).json({
        error: ClientErrorCode.AUTH_FAILED,
        message: 'リフレッシュトークンが必要です'
      });
      return;
    }

    // リフレッシュトークンを検証
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!JWT_REFRESH_SECRET) {
      log.error('JWT secret not configured');
      sendErrorResponse(res, 500, ClientErrorCode.SERVICE_UNAVAILABLE);
      return;
    }

    // コンパクトトークンの場合、idフィールドをuserIdにマッピング
    let decoded: any;
    try {
      decoded = verifyCompactToken(refreshToken, true);
      // コンパクトトークンの場合、idフィールドをuserIdにマッピング
      if (decoded.id) {
        decoded.userId = decoded.id;
      }
    } catch {
      // 従来形式のトークンとして検証
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
    }

    // 管理者として検索
    const admin = await AdminModel.findById(decoded.userId);
    if (!admin || !admin.isActive) {
      log.warn('Admin token refresh failed - admin not found or inactive', { userId: decoded.id });
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
    }

    // 新しいアクセストークンを生成（管理者用に2時間の有効期限）
    const newAccessToken = generateCompactAccessToken(admin._id.toString(), 'admin', '2h');
    
    // Cookie設定（Feature Flag対応）
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = getCookieConfig(isProduction);
    const cookieDomain = process.env.COOKIE_DOMAIN || (isProduction ? '.charactier-ai.com' : undefined);
    if (cookieDomain) {
      cookieOptions.domain = cookieDomain;
    }
    
    // Cookieに新しいアクセストークンを設定（管理者用）
    res.cookie(COOKIE_NAMES.ADMIN_ACCESS, newAccessToken, getAccessTokenCookieOptions(isProduction));
    
    log.info('Admin token refreshed successfully', { adminId: admin._id.toString() });
    
    // レスポンス（Feature Flag対応）
    if (flags.SECURE_COOKIE_AUTH) {
      // 新方式: トークンをレスポンスに含めない
      res.json({
        success: true,
        message: '管理者トークンが更新されました'
      });
    } else {
      // 従来方式: トークンをレスポンスに含める
      res.json({
        accessToken: newAccessToken,
        message: '管理者トークンが更新されました'
      });
    }

  } catch (error) {
    log.error('Admin token refresh error', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      log.warn('Admin refresh token expired', {
        expiredAt: error.expiredAt,
        message: error.message
      });
      res.status(401).json({
        error: ClientErrorCode.TOKEN_EXPIRED,
        message: 'リフレッシュトークンの有効期限が切れています。再度ログインしてください。',
        requireRelogin: true
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      log.warn('Invalid admin refresh token', { message: error.message });
      res.status(401).json({
        error: ClientErrorCode.AUTH_FAILED,
        message: '無効なリフレッシュトークンです',
        requireRelogin: true
      });
    } else {
      const errorCode = mapErrorToClientCode(error);
      sendErrorResponse(res, 500, errorCode, error);
    }
  }
});

export default router;