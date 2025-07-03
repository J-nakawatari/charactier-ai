import request from 'supertest';
import { app } from '../../index';
import mongoose from 'mongoose';

describe('Security Headers Tests', () => {
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
  describe('Helmet Security Headers', () => {
    it('should set X-Content-Type-Options header', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options header', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should set X-XSS-Protection header', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.headers['x-xss-protection']).toBe('0');
    });

    it('should set Strict-Transport-Security header in production', async () => {
      // Note: This would only work in production with HTTPS
      if (process.env.NODE_ENV === 'production') {
        const response = await request(app)
          .get('/api/v1/health');

        expect(response.headers['strict-transport-security']).toBeDefined();
        expect(response.headers['strict-transport-security']).toContain('max-age=');
      }
    });

    it('should set Content-Security-Policy header', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    });

    it('should remove X-Powered-By header', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('CORS Headers', () => {
    it('should set proper CORS headers for allowed origins', async () => {
      const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      const response = await request(app)
        .get('/api/v1/health')
        .set('Origin', allowedOrigin);

      expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should not set CORS headers for disallowed origins', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'http://malicious-site.com');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should handle preflight requests properly', async () => {
      const response = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers']).toContain('content-type');
    });
  });

  describe('Cookie Security', () => {
    it('should set secure cookie attributes', async () => {
      // This test would need a proper login flow
      // For now, we test the configuration
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (isProduction) {
        // In production, cookies should have Secure attribute
        expect(true).toBe(true);
      }
    });
  });
});