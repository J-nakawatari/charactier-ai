import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { verifyCsrfToken, setCsrfToken, getCsrfToken } from '../../middleware/csrf';
import jwt from 'jsonwebtoken';

// テスト用のJWTシークレット
const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing';

describe('CSRF保護テスト - 管理者エンドポイント', () => {
  let app: Express;

  // CSRFトークン取得のヘルパー関数
  const getCsrfTokenAndCookies = async () => {
    const tokenRes = await request(app)
      .get('/api/v1/csrf-token')
      .expect(200);

    const csrfToken = tokenRes.body.csrfToken;
    const cookiesHeader = tokenRes.headers['set-cookie'];
    const cookies = Array.isArray(cookiesHeader) ? cookiesHeader : cookiesHeader ? [cookiesHeader] : [];
    
    // XSRF-TOKENクッキーから値を抽出
    const xsrfCookie = cookies.find((c: string) => c.startsWith('XSRF-TOKEN='));
    const xsrfToken = xsrfCookie?.split(';')[0].split('=')[1];

    return {
      csrfToken,
      xsrfToken: xsrfToken || csrfToken,
      cookieHeader: cookies.join('; ')
    };
  };

  // 管理者トークンを生成
  const generateAdminToken = () => {
    return jwt.sign({ adminId: '123456789012345678901234', role: 'super_admin' }, TEST_JWT_SECRET);
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(setCsrfToken); // グローバルCSRFトークン設定

    // CSRFトークン取得エンドポイント
    app.get('/api/v1/csrf-token', getCsrfToken);

    // 管理者認証ミドルウェア（簡易版）
    const authenticateAdmin = (req: any, res: any, next: any) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        try {
          const decoded = jwt.verify(token, TEST_JWT_SECRET) as any;
          req.admin = { _id: decoded.adminId, role: decoded.role };
          next();
        } catch {
          res.status(401).json({ error: 'Invalid token' });
        }
      } else {
        res.status(401).json({ error: 'No token' });
      }
    };

    // テスト用エンドポイント（実際のルートを簡略化）
    // キャラクター管理
    app.post('/api/v1/admin/characters', authenticateAdmin, verifyCsrfToken, async (req, res) => {
      res.json({ success: true, message: 'Character created' });
    });

    app.put('/api/v1/admin/characters/:id', authenticateAdmin, verifyCsrfToken, async (req, res) => {
      res.json({ success: true, message: 'Character updated' });
    });

    app.put('/api/v1/admin/characters/reorder', authenticateAdmin, verifyCsrfToken, async (req, res) => {
      res.json({ success: true, message: 'Characters reordered' });
    });

    app.patch('/api/v1/admin/characters/:id/toggle-active', authenticateAdmin, verifyCsrfToken, async (req, res) => {
      res.json({ success: true, message: 'Character toggled' });
    });

    // 通知管理
    app.post('/api/v1/notifications/:id/read', verifyCsrfToken, async (req, res) => {
      res.json({ success: true, message: 'Notification marked as read' });
    });

    app.post('/api/v1/notifications/admin', authenticateAdmin, verifyCsrfToken, async (req, res) => {
      res.json({ success: true, message: 'Admin notification created' });
    });

    app.delete('/api/v1/notifications/admin/:id', authenticateAdmin, verifyCsrfToken, async (req, res) => {
      res.json({ success: true, message: 'Admin notification deleted' });
    });

    // セキュリティ管理
    app.post('/api/v1/admin/security/lift-sanction/:userId', authenticateAdmin, verifyCsrfToken, async (req, res) => {
      res.json({ success: true, message: 'Sanction lifted' });
    });

    app.delete('/api/v1/admin/security/violations/clear', authenticateAdmin, verifyCsrfToken, async (req, res) => {
      res.json({ success: true, message: 'Violations cleared' });
    });
  });

  describe('キャラクター管理API', () => {
    test('キャラクター作成 - CSRFトークンありで成功', async () => {
      const { xsrfToken, cookieHeader } = await getCsrfTokenAndCookies();
      const adminToken = generateAdminToken();

      const response = await request(app)
        .post('/api/v1/admin/characters')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', xsrfToken)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: { ja: '新キャラ', en: 'New Char' }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('キャラクター作成 - CSRFトークンなしで失敗', async () => {
      const adminToken = generateAdminToken();

      const response = await request(app)
        .post('/api/v1/admin/characters')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: { ja: '新キャラ', en: 'New Char' }
        })
        .expect(403);

      expect(response.body.error).toContain('CSRF');
    });

    test('キャラクター更新 - CSRFトークンありで成功', async () => {
      const { xsrfToken, cookieHeader } = await getCsrfTokenAndCookies();
      const adminToken = generateAdminToken();

      const response = await request(app)
        .put('/api/v1/admin/characters/123')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', xsrfToken)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: { ja: '更新キャラ', en: 'Updated Char' }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('キャラクター並び替え - CSRFトークンありで成功', async () => {
      const { xsrfToken, cookieHeader } = await getCsrfTokenAndCookies();
      const adminToken = generateAdminToken();

      const response = await request(app)
        .put('/api/v1/admin/characters/reorder')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', xsrfToken)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          characterIds: ['123', '456']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('通知API', () => {
    test('通知既読マーク - CSRFトークンありで成功', async () => {
      const { xsrfToken, cookieHeader } = await getCsrfTokenAndCookies();

      const response = await request(app)
        .post('/api/v1/notifications/123/read')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', xsrfToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('管理者通知作成 - CSRFトークンありで成功', async () => {
      const { xsrfToken, cookieHeader } = await getCsrfTokenAndCookies();
      const adminToken = generateAdminToken();

      const response = await request(app)
        .post('/api/v1/notifications/admin')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', xsrfToken)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { ja: '新通知', en: 'New Notice' },
          message: { ja: 'メッセージ', en: 'Message' }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('セキュリティ管理API', () => {
    test('制裁解除 - CSRFトークンありで成功', async () => {
      const { xsrfToken, cookieHeader } = await getCsrfTokenAndCookies();
      const adminToken = generateAdminToken();

      const response = await request(app)
        .post('/api/v1/admin/security/lift-sanction/123456789012345678901234')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', xsrfToken)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('違反履歴クリア - CSRFトークンありで成功', async () => {
      const { xsrfToken, cookieHeader } = await getCsrfTokenAndCookies();
      const adminToken = generateAdminToken();

      const response = await request(app)
        .delete('/api/v1/admin/security/violations/clear')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', xsrfToken)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('違反履歴クリア - CSRFトークンなしで失敗', async () => {
      const adminToken = generateAdminToken();

      const response = await request(app)
        .delete('/api/v1/admin/security/violations/clear')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.error).toContain('CSRF');
    });
  });
});