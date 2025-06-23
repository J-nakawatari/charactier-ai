import type { AuthRequest } from '../types/express';
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/UserModel';
import { AdminModel } from '../models/AdminModel';
import { generateAccessToken, generateRefreshToken, authenticateToken } from '../middleware/auth';
import { sendVerificationEmail, generateVerificationToken, isDisposableEmail } from '../utils/sendEmail';
import { registrationRateLimit } from '../middleware/registrationLimit';
import { validate } from '../middleware/validation';
import { authSchemas } from '../validation/schemas';
import log from '../utils/logger';
import { sendErrorResponse, ClientErrorCode, mapErrorToClientCode } from '../utils/errorResponse';

const router: Router = Router();

// ユーザー登録（メール認証付き）
router.post('/register', 
  registrationRateLimit, 
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
      email, 
      isActive: { $ne: false } 
    });
    if (existingUser) {
      log.warn('Registration attempt with existing email', { email });
      sendErrorResponse(res, 409, ClientErrorCode.ALREADY_EXISTS);
      return;
    }

    // パスワードをハッシュ化
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

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
  validate({ body: authSchemas.login }),
  async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // ユーザーを検索
    const user = await UserModel.findOne({ email });
    if (!user) {
      log.warn('Login attempt with non-existent email', { email });
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
    }

    // パスワードを確認
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      log.warn('Login attempt with invalid password', { email, userId: user._id.toString() });
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
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

    // JWTトークンを生成
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    log.info('User logged in', { userId: user._id.toString(), email: user.email });
    log.debug('User login details', {
      userId: user._id.toString(),
      fields: Object.keys(user.toObject()),
      isSetupComplete: user.isSetupComplete,
      isSetupCompleteType: typeof user.isSetupComplete
    });

    // Cookie設定（本番環境では secure: true にする）
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN || (isProduction ? '.charactier-ai.com' : undefined);
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'lax' as const : 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24時間
      domain: cookieDomain,
      path: '/'
    };
    
    const refreshCookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'lax' as const : 'strict' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
      domain: process.env.COOKIE_DOMAIN || (isProduction ? '.charactier-ai.com' : undefined),
      path: '/'
    };
    
    // Cookieにトークンを設定（ユーザー用）
    res.cookie('userAccessToken', accessToken, cookieOptions);
    res.cookie('userRefreshToken', refreshToken, refreshCookieOptions);
    
    // ログイン成功レスポンス
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      tokenBalance: user.tokenBalance,
      isSetupComplete: user.isSetupComplete
    };
    
    log.debug('Sending user response', { userId: user._id.toString(), isSetupComplete: userResponse.isSetupComplete });
    
    res.json({
      message: 'ログインしました',
      user: userResponse,
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    const errorCode = mapErrorToClientCode(error);
    sendErrorResponse(res, 500, errorCode, error);
  }
});

// トークンリフレッシュ
router.post('/refresh', 
  validate({ body: authSchemas.refreshToken }),
  async (req: Request, res: Response): Promise<void> => {
  try {
    // Cookieまたはボディからリフレッシュトークンを取得（ユーザー用と管理者用の両方をチェック）
    const refreshToken = req.cookies?.refreshToken || req.cookies?.userRefreshToken || req.cookies?.adminRefreshToken || req.body.refreshToken;

    // リフレッシュトークンを検証
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!JWT_REFRESH_SECRET) {
      log.error('JWT secret not configured');
      sendErrorResponse(res, 500, ClientErrorCode.SERVICE_UNAVAILABLE);
      return;
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };

    // まず管理者として検索
    const admin = await AdminModel.findById(decoded.userId);
    if (admin && admin.isActive) {
      // 管理者用の新しいアクセストークンを生成
      const newAccessToken = generateAccessToken(admin._id.toString());
      
      // Cookie設定
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieDomain = process.env.COOKIE_DOMAIN || (isProduction ? '.charactier-ai.com' : undefined);
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'lax' as const : 'strict' as const,
        maxAge: 24 * 60 * 60 * 1000 // 24時間
      };
      
      // Cookieに新しいアクセストークンを設定
      res.cookie('accessToken', newAccessToken, cookieOptions);
      
      res.json({
        accessToken: newAccessToken
      });
      return;
    }

    // 管理者で見つからない場合は一般ユーザーとして検索
    const user = await UserModel.findById(decoded.userId);
    if (!user || !user.isActive) {
      log.warn('Token refresh failed - user not found or inactive', { userId: decoded.userId });
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
    }

    // 新しいアクセストークンを生成
    const newAccessToken = generateAccessToken(user._id.toString());
    
    // Cookie設定
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'lax' as const : 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24時間
      domain: process.env.COOKIE_DOMAIN || (isProduction ? '.charactier-ai.com' : undefined),
      path: '/'
    };
    
    // Cookieに新しいアクセストークンを設定
    res.cookie('accessToken', newAccessToken, cookieOptions);

    res.json({
      accessToken: newAccessToken
    });

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
      { name: name.trim() },
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
router.post('/user/setup-complete', authenticateToken, async (req: Request, res: Response): Promise<void> => {
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
        name: name.trim(),
        selectedCharacter: selectedCharacterId,
        isSetupComplete: true,
        tokenBalance: 10000 // 初回セットアップ完了ボーナス
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
router.get('/verify-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      sendErrorResponse(res, 400, ClientErrorCode.INVALID_INPUT);
      return;
    }

    // トークンでユーザーを検索（selectでトークンフィールドを含める）
    const user = await UserModel.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      log.warn('Email verification failed - invalid or expired token', { token });
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND);
      return;
    }

    // 既に認証済みの場合
    if (user.emailVerified) {
      log.info('Email verification attempt for already verified user', { userId: user._id.toString() });
      sendErrorResponse(res, 400, ClientErrorCode.ALREADY_EXISTS);
      return;
    }

    // メールアドレスを認証済みに更新
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    
    // メール認証時のトークン付与を削除（セットアップ完了時に付与するため）

    await user.save();

    // JWTトークンを生成
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    
    // Cookie設定
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'lax' as const : 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24時間
      domain: process.env.COOKIE_DOMAIN || (isProduction ? '.charactier-ai.com' : undefined),
      path: '/'
    };
    
    const refreshCookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'lax' as const : 'strict' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
      domain: process.env.COOKIE_DOMAIN || (isProduction ? '.charactier-ai.com' : undefined),
      path: '/'
    };
    
    // Cookieにトークンを設定（ユーザー用）
    res.cookie('userAccessToken', accessToken, cookieOptions);
    res.cookie('userRefreshToken', refreshToken, refreshCookieOptions);

    log.info('Email verified successfully', { email: user.email, userId: user._id.toString() });

    res.json({
      message: 'メールアドレスが確認されました',
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    const errorCode = mapErrorToClientCode(error);
    sendErrorResponse(res, 500, errorCode, error);
  }
});

// 認証メール再送信
router.post('/resend-verification', registrationRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, locale = 'ja' } = req.body;

    if (!email) {
      sendErrorResponse(res, 400, ClientErrorCode.MISSING_REQUIRED_FIELD);
      return;
    }

    const user = await UserModel.findOne({ email }).select('+emailVerificationToken +emailVerificationExpires');
    
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
router.post('/admin/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // バリデーション
    if (!email || !password) {
      sendErrorResponse(res, 400, ClientErrorCode.MISSING_REQUIRED_FIELD);
      return;
    }

    // AdminModelから管理者を検索
    const admin = await AdminModel.findOne({ email });
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

    // パスワード検証
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      log.warn('Admin login attempt with invalid password', { email, adminId: admin._id.toString() });
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
    }

    // ログイン日時を更新
    admin.lastLogin = new Date();
    await admin.save();

    // JWTトークン生成（管理者専用）
    const adminId = admin._id as string;
    const accessToken = generateAccessToken(adminId.toString());
    const refreshToken = generateRefreshToken(adminId.toString());
    
    // Cookie設定
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'lax' as const : 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24時間
      domain: process.env.COOKIE_DOMAIN || (isProduction ? '.charactier-ai.com' : undefined),
      path: '/'
    };
    
    const refreshCookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'lax' as const : 'strict' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
      domain: process.env.COOKIE_DOMAIN || (isProduction ? '.charactier-ai.com' : undefined),
      path: '/'
    };
    
    // Cookieにトークンを設定（管理者用）
    res.cookie('adminAccessToken', accessToken, cookieOptions);
    res.cookie('adminRefreshToken', refreshToken, refreshCookieOptions);

    log.info('Admin login successful', { adminId: admin._id.toString(), email: admin.email, role: admin.role });

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
      }
    });

  } catch (error) {
    const errorCode = mapErrorToClientCode(error);
    sendErrorResponse(res, 500, errorCode, error);
  }
});

// トークン検証
router.get('/verify-token', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
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
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    // すべての認証関連Cookieをクリア（ユーザー用と管理者用の両方）
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN || (isProduction ? '.charactier-ai.com' : undefined);
    const clearOptions = {
      domain: cookieDomain,
      path: '/'
    };
    
    res.clearCookie('accessToken', clearOptions);
    res.clearCookie('refreshToken', clearOptions);
    res.clearCookie('userAccessToken', clearOptions);
    res.clearCookie('userRefreshToken', clearOptions);
    res.clearCookie('adminAccessToken', clearOptions);
    res.clearCookie('adminRefreshToken', clearOptions);
    
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
router.post('/admin/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    // 管理者用Cookieをクリア
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN || (isProduction ? '.charactier-ai.com' : undefined);
    const clearOptions = {
      domain: cookieDomain,
      path: '/'
    };
    
    res.clearCookie('adminAccessToken', clearOptions);
    res.clearCookie('adminRefreshToken', clearOptions);
    
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
router.post('/create-admin', async (req: Request, res: Response): Promise<void> => {
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

    // パスワードをハッシュ化
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

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

// 管理者トークンリフレッシュ
router.post('/admin/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    // 管理者用リフレッシュトークンをCookieから取得
    const refreshToken = req.cookies?.adminRefreshToken;

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

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };

    // 管理者として検索
    const admin = await AdminModel.findById(decoded.userId);
    if (!admin || !admin.isActive) {
      log.warn('Admin token refresh failed - admin not found or inactive', { userId: decoded.userId });
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
    }

    // 新しいアクセストークンを生成
    const newAccessToken = generateAccessToken(admin._id.toString());
    
    // Cookie設定
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'lax' as const : 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24時間
      domain: process.env.COOKIE_DOMAIN || (isProduction ? '.charactier-ai.com' : undefined),
      path: '/'
    };
    
    // Cookieに新しいアクセストークンを設定（管理者用）
    res.cookie('adminAccessToken', newAccessToken, cookieOptions);
    
    log.info('Admin token refreshed successfully', { adminId: admin._id.toString() });
    
    res.json({
      accessToken: newAccessToken,
      message: '管理者トークンが更新されました'
    });

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