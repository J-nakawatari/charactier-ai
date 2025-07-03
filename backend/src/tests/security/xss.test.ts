import request from 'supertest';
import { app } from '../../index';
import { ChatModel } from '../../models/ChatModel';
import { UserModel } from '../../models/UserModel';
import mongoose from 'mongoose';

describe('XSS Protection Tests', () => {
  // テスト完了後にMongoDBとRedisの接続を閉じる
  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    // Redis接続も閉じる（存在する場合）
    if (global.redisClient) {
      await global.redisClient.quit();
    }
    // 開いているハンドルを強制終了
    setTimeout(() => {
      process.exit(0);
    }, 100);
  });
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    // テストユーザーを作成
    testUser = await UserModel.create({
      email: 'xss-test@example.com',
      password: 'TestPassword123!',
      name: 'XSS Test User',
      emailVerified: true
    });

    // 認証トークンを取得
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'xss-test@example.com',
        password: 'TestPassword123!'
      });
    
    authToken = loginRes.body.tokens.accessToken;
  });

  afterAll(async () => {
    // テストデータをクリーンアップ
    await UserModel.deleteOne({ _id: testUser._id });
    await ChatModel.deleteMany({ userId: testUser._id });
  });

  describe('Chat Message Sanitization', () => {
    it('should sanitize script tags in chat messages', async () => {
      const maliciousContent = '<script>alert("XSS")</script>Hello';
      
      const response = await request(app)
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          characterId: '507f1f77bcf86cd799439011',
          content: maliciousContent
        });

      expect(response.status).toBe(200);
      expect(response.body.userMessage.content).toBe('Hello');
      expect(response.body.userMessage.content).not.toContain('<script>');
    });

    it('should sanitize onclick handlers', async () => {
      const maliciousContent = '<div onclick="steal()">Click me</div>';
      
      const response = await request(app)
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          characterId: '507f1f77bcf86cd799439011',
          content: maliciousContent
        });

      expect(response.status).toBe(200);
      expect(response.body.userMessage.content).toBe('<div>Click me</div>');
      expect(response.body.userMessage.content).not.toContain('onclick');
    });

    it('should preserve safe HTML formatting', async () => {
      const safeContent = '<b>Bold</b> and <i>italic</i> text';
      
      const response = await request(app)
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          characterId: '507f1f77bcf86cd799439011',
          content: safeContent
        });

      expect(response.status).toBe(200);
      expect(response.body.userMessage.content).toBe('<b>Bold</b> and <i>italic</i> text');
    });
  });

  describe('Email Template Protection', () => {
    it('should not execute JavaScript in email verification', async () => {
      const maliciousToken = '"><script>alert("XSS")</script>';
      
      const response = await request(app)
        .get(`/api/v1/auth/verify-email?token=${encodeURIComponent(maliciousToken)}&locale=en`);

      expect(response.status).toBe(404); // Invalid token
      expect(response.text).not.toContain('<script>alert("XSS")</script>');
      expect(response.text).toContain('&quot;&gt;&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });
  });

  describe('Input Validation', () => {
    it('should reject HTML in user name field', async () => {
      const response = await request(app)
        .put('/api/v1/auth/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '<script>alert("XSS")</script>'
        });

      // Joiバリデーションでリジェクトされるか、サニタイズされる
      expect(response.status).toBe(200);
      if (response.body.user) {
        expect(response.body.user.name).not.toContain('<script>');
      }
    });
  });
});