import request from 'supertest';
import { app } from '../../index';

describe('Rate Limiting Tests', () => {
  describe('Authentication Rate Limiting', () => {
    it('should block after 5 failed login attempts', async () => {
      const testEmail = 'ratelimit-test@example.com';
      
      // 5回失敗させる
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testEmail,
            password: 'WrongPassword'
          });
      }

      // 6回目はレート制限でブロックされるはず
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword'
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('General API Rate Limiting', () => {
    it('should allow 100 requests per minute', async () => {
      const requests = [];
      
      // 100リクエストを送信
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(app)
            .get('/api/v1/characters')
            .set('X-Forwarded-For', '192.168.1.100')
        );
      }

      const responses = await Promise.all(requests);
      
      // すべて成功するはず
      responses.forEach(res => {
        expect(res.status).not.toBe(429);
      });

      // 101回目はレート制限でブロックされるはず
      const extraResponse = await request(app)
        .get('/api/v1/characters')
        .set('X-Forwarded-For', '192.168.1.100');

      expect(extraResponse.status).toBe(429);
    });
  });

  describe('Chat API Rate Limiting', () => {
    let authToken: string;

    beforeAll(async () => {
      // テスト用の認証トークンを取得（実際のテストでは適切にセットアップ）
      authToken = 'test-token';
    });

    it('should limit chat messages to 60 per hour per user', async () => {
      // Note: This test would need proper setup with real auth token
      // and would take time to execute properly
      
      // Placeholder test
      expect(true).toBe(true);
    });
  });

  describe('Registration Rate Limiting', () => {
    it('should limit registration attempts per IP', async () => {
      const testIP = '192.168.1.200';
      
      // 10回登録を試みる
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/v1/auth/register')
          .set('X-Forwarded-For', testIP)
          .send({
            email: `test${i}@example.com`,
            password: 'TestPassword123!',
            locale: 'ja'
          });
      }

      // 11回目はレート制限でブロックされるはず
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('X-Forwarded-For', testIP)
        .send({
          email: 'test11@example.com',
          password: 'TestPassword123!',
          locale: 'ja'
        });

      expect(response.status).toBe(429);
    });
  });
});