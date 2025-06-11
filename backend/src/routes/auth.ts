import { Router, Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/UserModel';
import { AdminModel } from '../models/AdminModel';
import { generateAccessToken, generateRefreshToken } from '../middleware/auth';

const router = Router();

// ユーザー登録
router.post('/register', async (req: Request, res: Response): Promise<void> => {
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

    if (password.length < 6) {
      res.status(400).json({
        error: 'Password too short',
        message: 'パスワードは6文字以上で入力してください'
      });
      return;
    }

    // メールアドレスの重複チェック
    const existingUser = await UserModel.findOne({ email });
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

    // 新規ユーザーを作成（名前は後でセットアップ画面で設定）
    const newUser = new UserModel({
      name: '', // セットアップ画面で設定予定
      email,
      password: hashedPassword,
      tokenBalance: 10000, // 新規ユーザーには10,000トークンを付与
      isActive: true
    });

    const savedUser = await newUser.save();
    console.log('✅ New user registered:', { id: savedUser._id, email: savedUser.email });

    // JWTトークンを生成
    const accessToken = generateAccessToken(savedUser._id.toString());
    const refreshToken = generateRefreshToken(savedUser._id.toString());

    // パスワードを除いてレスポンス
    res.status(201).json({
      message: 'ユーザー登録が完了しました',
      user: {
        _id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        tokenBalance: savedUser.tokenBalance
      },
      tokens: {
        accessToken,
        refreshToken
      }
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

    // JWTトークンを生成
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    console.log('✅ User logged in:', { id: user._id, email: user.email });

    // ログイン成功レスポンス
    res.json({
      message: 'ログインしました',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        tokenBalance: user.tokenBalance
      },
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

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };

    // ユーザーの存在確認
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
    res.status(401).json({
      error: 'Token refresh failed',
      message: 'トークンの更新に失敗しました'
    });
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
        permissions: admin.permissions,
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
      role: 'admin',
      permissions: [
        'users.read',
        'users.write',
        'characters.read',
        'characters.write',
        'tokens.read',
        'tokens.write',
        'system.read',
        'system.write'
      ],
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