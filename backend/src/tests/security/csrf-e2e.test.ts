import request from 'supertest';
import express, { Express } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import cookieParser from 'cookie-parser';
import { verifyCsrfToken, setCsrfToken, getCsrfToken } from '../../middleware/csrf';
import { UserModel } from '../../models/UserModel';
import { AdminModel } from '../../models/AdminModel';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// テスト用のJWTシークレット（本番環境では環境変数から取得）
const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing';

describe('CSRF E2E Tests - Real World Scenarios', () => {
  let app: Express;
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let testAdmin: any;

  beforeAll(async () => {
    // MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // テスト用ユーザー作成
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await UserModel.create({
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
      isEmailVerified: true,
      isSetupComplete: true
    });

    testAdmin = await AdminModel.create({
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Test Admin',
      role: 'admin'
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(setCsrfToken); // グローバルCSRFトークン設定

    // CSRFトークン取得エンドポイント
    app.get('/api/v1/csrf-token', getCsrfToken);

    // モックエンドポイント
    // ユーザー登録（CSRF保護あり）
    app.post('/api/v1/auth/register', verifyCsrfToken, async (req, res) => {
      res.json({ success: true, message: 'User registered' });
    });

    // ユーザーログイン（CSRF保護あり）
    app.post('/api/v1/auth/login', verifyCsrfToken, async (req, res) => {
      const token = jwt.sign({ userId: testUser._id }, TEST_JWT_SECRET);
      res.cookie('userAccessToken', token, { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 2 * 60 * 60 * 1000 // 2時間
      });
      res.json({ success: true, user: { id: testUser._id } });
    });

    // 管理者ログイン（CSRF保護を追加予定）
    app.post('/api/v1/auth/admin/login', verifyCsrfToken, async (req, res) => {
      const token = jwt.sign({ adminId: testAdmin._id }, TEST_JWT_SECRET);
      res.cookie('adminAccessToken', token, { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 2 * 60 * 60 * 1000 // 2時間
      });
      res.json({ success: true, user: { id: testAdmin._id } });
    });

    // ファイルアップロード（CSRF保護を追加予定）
    app.post('/api/v1/admin/characters/upload/image', verifyCsrfToken, async (req, res) => {
      res.json({ success: true, url: '/uploads/test.jpg' });
    });

    // リフレッシュトークン（CSRF保護なし - 意図的）
    app.post('/api/v1/auth/refresh', async (req, res) => {
      res.json({ success: true, accessToken: 'new-token' });
    });
  });

  describe('ユーザー認証フロー', () => {
    test('新規登録 - CSRFトークンありで成功', async () => {
      // 1. CSRFトークンを取得
      const tokenRes = await request(app)
        .get('/api/v1/csrf-token')
        .expect(200);

      const csrfToken = tokenRes.body.csrfToken;
      const cookie = tokenRes.headers['set-cookie'][0];

      // 2. 登録リクエスト
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: 'newuser@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('新規登録 - CSRFトークンなしで失敗', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123'
        })
        .expect(403);

      expect(response.body.error).toContain('CSRF');
    });

    test('ログイン - CSRFトークンありで成功', async () => {
      // 1. CSRFトークンを取得
      const tokenRes = await request(app)
        .get('/api/v1/csrf-token')
        .expect(200);

      const csrfToken = tokenRes.body.csrfToken;
      const cookie = tokenRes.headers['set-cookie'][0];

      // 2. ログインリクエスト
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.headers['set-cookie']).toBeDefined();
    });
  });

  describe('管理者認証フロー', () => {
    test('管理者ログイン - CSRFトークンありで成功', async () => {
      // 1. CSRFトークンを取得
      const tokenRes = await request(app)
        .get('/api/v1/csrf-token')
        .expect(200);

      const csrfToken = tokenRes.body.csrfToken;
      const cookie = tokenRes.headers['set-cookie'][0];

      // 2. 管理者ログイン
      const response = await request(app)
        .post('/api/v1/auth/admin/login')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: 'admin@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('管理者ログイン - CSRFトークンなしで失敗', async () => {
      const response = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({
          email: 'admin@example.com',
          password: 'password123'
        })
        .expect(403);

      expect(response.body.error).toContain('CSRF');
    });
  });

  describe('ファイルアップロード', () => {
    test('画像アップロード - CSRFトークンありで成功', async () => {
      // 1. CSRFトークンを取得
      const tokenRes = await request(app)
        .get('/api/v1/csrf-token')
        .expect(200);

      const csrfToken = tokenRes.body.csrfToken;
      const cookie = tokenRes.headers['set-cookie'][0];

      // 2. アップロードリクエスト（FormDataをシミュレート）
      const response = await request(app)
        .post('/api/v1/admin/characters/upload/image')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken)
        .field('name', 'test-image')
        .attach('image', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('リフレッシュトークン（CSRF保護なし）', () => {
    test('リフレッシュトークン - CSRFトークンなしでも成功', async () => {
      // CSRFトークンなしでリクエスト
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('実際のユーザーフロー', () => {
    test('完全な認証フロー: 初回アクセス → ログイン → API呼び出し', async () => {
      const agent = request.agent(app); // Cookie永続化のためagent使用

      // 1. 初回アクセス（CSRFトークン取得）
      await agent
        .get('/api/v1/csrf-token')
        .expect(200);

      // 2. ログイン
      const loginRes = await agent
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(loginRes.body.success).toBe(true);

      // 3. 認証が必要なAPIを呼び出し（ここでは画像アップロード）
      const uploadRes = await agent
        .post('/api/v1/admin/characters/upload/image')
        .field('name', 'test-image')
        .expect(200);

      expect(uploadRes.body.success).toBe(true);
    });
  });
});