import type { AuthRequest } from '../types/express';
import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/UserModel';
import { AdminModel } from '../models/AdminModel';
import { generateAccessToken, generateRefreshToken } from '../middleware/auth';
import { sendVerificationEmail, generateVerificationToken, isDisposableEmail } from '../utils/sendEmail';
import { registrationRateLimit } from '../middleware/registrationLimit';

const router: Router = Router();

// ユーザー登録（メール認証付き）
router.post('/register', registrationRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, locale = 'ja' } = req.body;

    // バリデーション
    if (!email || !password) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'メールアドレスとパスワードを入力してください'
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        error: 'Password too short',
        message: 'パスワードは6文字以上で入力してください'
      });
      return;
    }

    // 使い捨てメールアドレスのチェック
    if (isDisposableEmail(email)) {
      res.status(400).json({
        error: 'Invalid email',
        message: '使い捨てメールアドレスは使用できません'
      });
      return;
    }

    // メールアドレスの重複チェック（アクティブユーザーのみ）
    const existingUser = await UserModel.findOne({ 
      email, 
      isActive: { $ne: false } 
    });
    if (existingUser) {
      res.status(409).json({
        error: 'Email already exists',
        message: 'このメールアドレスは既に登録されています'
      });
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
    console.log('✅ New user registered (pending verification):', { id: savedUser._id, email: savedUser.email });

    // 認証メールを送信
    try {
      await sendVerificationEmail(email, verificationToken, locale as 'ja' | 'en');
      console.log('✅ Verification email sent successfully to:', email);
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      // エラーの詳細をログに出力
      if (emailError instanceof Error) {
        console.error('Error details:', emailError.message);
        console.error('Stack trace:', emailError.stack);
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
    console.error('❌ User registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'ユーザー登録中にエラーが発生しました'
    });
  }
});

// ユーザーログイン
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // バリデーション
    if (!email || !password) {
      res.status(400).json({
        error: 'Missing credentials',
        message: 'メールアドレスとパスワードを入力してください'
      });
      return;
    }

    // ユーザーを検索
    const user = await UserModel.findOne({ email });
    if (!user) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'メールアドレスまたはパスワードが正しくありません'
      });
      return;
    }

    // パスワードを確認
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'メールアドレスまたはパスワードが正しくありません'
      });
      return;
    }

    // アクティブユーザーかチェック
    if (!user.isActive) {
      res.status(403).json({
        error: 'Account deactivated',
        message: 'アカウントが無効化されています'
      });
      return;
    }

    // メール認証チェック
    if (!user.emailVerified) {
      res.status(403).json({
        error: 'Email not verified',
        message: 'メールアドレスが認証されていません。確認メールをご確認ください。',
        emailNotVerified: true
      });
      return;
    }

    // JWTトークンを生成
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    console.log('✅ User logged in:', { id: user._id, email: user.email });
    console.log('🔍 Raw user object fields:', Object.keys(user.toObject()));
    console.log('🔍 User isSetupComplete raw:', user.isSetupComplete);
    console.log('🔍 User isSetupComplete type:', typeof user.isSetupComplete);
    console.log('🔍 User full object:', JSON.stringify(user.toObject(), null, 2));

    // ログイン成功レスポンス
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      tokenBalance: user.tokenBalance,
      isSetupComplete: user.isSetupComplete
    };
    
    console.log('🔍 Sending user response:', JSON.stringify(userResponse, null, 2));
    
    res.json({
      message: 'ログインしました',
      user: userResponse,
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('❌ User login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'ログイン中にエラーが発生しました'
    });
  }
});

// トークンリフレッシュ
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: 'Refresh token required',
        message: 'リフレッシュトークンが必要です'
      });
      return;
    }

    // リフレッシュトークンを検証
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!JWT_REFRESH_SECRET) {
      res.status(500).json({
        error: 'Configuration error',
        message: '認証設定エラー'
      });
      return;
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };

    // まず管理者として検索
    const admin = await AdminModel.findById(decoded.userId);
    if (admin && admin.isActive) {
      // 管理者用の新しいアクセストークンを生成
      const newAccessToken = generateAccessToken(admin._id.toString());
      res.json({
        accessToken: newAccessToken
      });
      return;
    }

    // 管理者で見つからない場合は一般ユーザーとして検索
    const user = await UserModel.findById(decoded.userId);
    if (!user || !user.isActive) {
      res.status(401).json({
        error: 'Invalid refresh token',
        message: '無効なリフレッシュトークンです'
      });
      return;
    }

    // 新しいアクセストークンを生成
    const newAccessToken = generateAccessToken(user._id.toString());

    res.json({
      accessToken: newAccessToken
    });

  } catch (error) {
    console.error('❌ Token refresh error:', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      console.error('⏰ Refresh token expired:', {
        expiredAt: error.expiredAt,
        message: error.message
      });
      res.status(401).json({
        error: 'Refresh token expired',
        message: 'リフレッシュトークンの有効期限が切れています。再度ログインしてください。',
        requireRelogin: true
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error('🔴 Invalid refresh token:', error.message);
      res.status(401).json({
        error: 'Invalid refresh token',
        message: '無効なリフレッシュトークンです',
        requireRelogin: true
      });
    } else {
      res.status(500).json({
        error: 'Token refresh failed',
        message: 'トークンの更新に失敗しました'
      });
    }
  }
});

// ユーザープロフィール更新
router.put('/user/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({
        error: 'Name required',
        message: '名前を入力してください'
      });
      return;
    }

    // JWTからユーザーIDを取得（authenticateTokenミドルウェアで設定）
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    if (!userId) {
      res.status(401).json({
        error: 'Authentication required',
        message: '認証が必要です'
      });
      return;
    }

    // ユーザー情報を更新
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { name: name.trim() },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      res.status(404).json({
        error: 'User not found',
        message: 'ユーザーが見つかりません'
      });
      return;
    }

    console.log('✅ Profile updated:', { id: updatedUser._id, name: updatedUser.name });

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
    console.error('❌ Profile update error:', error);
    res.status(500).json({
      error: 'Profile update failed',
      message: 'プロフィール更新中にエラーが発生しました'
    });
  }
});

// 初回セットアップ完了
router.post('/user/setup-complete', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, selectedCharacterId } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({
        error: 'Name required',
        message: '名前を入力してください'
      });
      return;
    }

    if (!selectedCharacterId) {
      res.status(400).json({
        error: 'Character selection required',
        message: 'キャラクターを選択してください'
      });
      return;
    }

    // JWTからユーザーIDを取得
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    if (!userId) {
      res.status(401).json({
        error: 'Authentication required',
        message: '認証が必要です'
      });
      return;
    }

    // ユーザー情報を更新（名前、選択キャラ、セットアップ完了フラグ）
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { 
        name: name.trim(),
        selectedCharacter: selectedCharacterId,
        isSetupComplete: true
      },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      res.status(404).json({
        error: 'User not found',
        message: 'ユーザーが見つかりません'
      });
      return;
    }

    console.log('✅ Setup completed:', { 
      id: updatedUser._id, 
      name: updatedUser.name,
      selectedCharacter: selectedCharacterId 
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
    console.error('❌ Setup completion error:', error);
    res.status(500).json({
      error: 'Setup completion failed',
      message: 'セットアップ完了中にエラーが発生しました'
    });
  }
});

// メールアドレス認証
router.get('/verify-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        error: 'Invalid token',
        message: '無効なトークンです'
      });
      return;
    }

    // トークンでユーザーを検索（selectでトークンフィールドを含める）
    const user = await UserModel.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      res.status(404).json({
        error: 'Token not found or expired',
        message: 'トークンが見つからないか、有効期限が切れています'
      });
      return;
    }

    // 既に認証済みの場合
    if (user.emailVerified) {
      res.status(400).json({
        error: 'Already verified',
        message: 'このメールアドレスは既に認証されています'
      });
      return;
    }

    // メールアドレスを認証済みに更新
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    
    // 初回認証ボーナスを付与
    if (user.tokenBalance === 0) {
      user.tokenBalance = 2000; // 認証完了で2000トークン付与
      console.log(`✅ Initial token bonus granted: ${user.email} (+2000 tokens)`);
    }

    await user.save();

    // JWTトークンを生成
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    console.log('✅ Email verified:', user.email);

    res.json({
      message: 'メールアドレスが確認されました',
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('❌ Email verification error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: 'メール認証中にエラーが発生しました'
    });
  }
});

// 認証メール再送信
router.post('/resend-verification', registrationRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, locale = 'ja' } = req.body;

    if (!email) {
      res.status(400).json({
        error: 'Email required',
        message: 'メールアドレスを入力してください'
      });
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
      res.status(400).json({
        error: 'Already verified',
        message: 'このメールアドレスは既に認証されています'
      });
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
      console.log('✅ Verification email resent:', email);
    } catch (emailError) {
      console.error('❌ Failed to resend verification email:', emailError);
    }

    res.json({
      message: locale === 'ja' 
        ? '確認メールを再送信しました' 
        : 'Verification email resent'
    });

  } catch (error) {
    console.error('❌ Resend verification error:', error);
    res.status(500).json({
      error: 'Resend failed',
      message: '再送信中にエラーが発生しました'
    });
  }
});

// 管理者ログイン
router.post('/admin/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // バリデーション
    if (!email || !password) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'メールアドレスとパスワードを入力してください'
      });
      return;
    }

    // AdminModelから管理者を検索
    const admin = await AdminModel.findOne({ email });
    if (!admin) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'メールアドレスまたはパスワードが正しくありません'
      });
      return;
    }

    // アクティブ管理者かチェック
    if (!admin.isActive) {
      res.status(403).json({
        error: 'Account deactivated',
        message: '管理者アカウントが無効化されています'
      });
      return;
    }

    // パスワード検証
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'メールアドレスまたはパスワードが正しくありません'
      });
      return;
    }

    // ログイン日時を更新
    admin.lastLogin = new Date();
    await admin.save();

    // JWTトークン生成（管理者専用）
    const adminId = admin._id as string;
    const accessToken = generateAccessToken(adminId.toString());
    const refreshToken = generateRefreshToken(adminId.toString());

    console.log('✅ Admin login successful:', { id: admin._id, email: admin.email, role: admin.role });

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
    console.error('❌ Admin login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'サーバーエラーが発生しました'
    });
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
    console.log('✅ 管理者を作成しました');

    res.status(201).json({
      message: '管理者を作成しました',
      email: adminEmail,
      password: adminPassword,
      isNew: true
    });

  } catch (error) {
    console.error('❌ 管理者作成エラー:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '管理者の作成に失敗しました'
    });
  }
});

export default router;