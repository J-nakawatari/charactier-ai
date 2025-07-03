import { generateEmailVerificationHTML } from '../../src/utils/emailTemplates';

describe('XSS Protection - Email Templates', () => {
  describe('generateEmailVerificationHTML', () => {
    it('should escape user data in success template', () => {
      const maliciousData = {
        userInfo: {
          name: '<script>alert("XSS")</script>',
          email: 'test@example.com<script>alert("email")</script>'
        },
        accessToken: 'token<script>alert("token")</script>',
        refreshToken: 'refresh<script>alert("refresh")</script>',
        frontendUrl: 'https://example.com<script>alert("url")</script>'
      };

      const html = generateEmailVerificationHTML('success', 'ja', maliciousData);

      // 悪意のあるスクリプトが無害化されていることを確認
      expect(html).not.toContain('<script>alert("XSS")');
      expect(html).not.toContain('<script>alert("email")');
      expect(html).not.toContain('<script>alert("token")');
      expect(html).not.toContain('<script>alert("url")');
      
      // エスケープされた文字列が含まれていることを確認
      expect(html).toContain('\\u003c'); // < がエスケープされている
      expect(html).toContain('\\u003e'); // > がエスケープされている
    });

    it('should handle various XSS injection attempts', () => {
      const xssAttempts = [
        {
          name: 'Event handler in userInfo',
          data: {
            userInfo: { name: 'User" onload="alert(1)' },
            accessToken: 'valid-token',
            refreshToken: 'valid-refresh'
          }
        },
        {
          name: 'JavaScript URL',
          data: {
            userInfo: { name: 'javascript:alert(1)' },
            accessToken: 'valid-token',
            refreshToken: 'valid-refresh',
            frontendUrl: 'javascript:alert(1)'
          }
        },
        {
          name: 'HTML entities',
          data: {
            userInfo: { name: '&lt;script&gt;alert(1)&lt;/script&gt;' },
            accessToken: 'valid-token',
            refreshToken: 'valid-refresh'
          }
        }
      ];

      xssAttempts.forEach(({ name, data }) => {
        const html = generateEmailVerificationHTML('success', 'en', data);
        
        // 危険な文字列が無害化されていることを確認
        expect(html).not.toContain('onload="alert(1)');
        expect(html).not.toContain('javascript:alert(1)');
        expect(html).not.toContain('<script>alert(1)');
      });
    });

    it('should generate safe HTML for all template types', () => {
      const types: Array<'success' | 'error' | 'already-verified' | 'expired' | 'server-error'> = 
        ['success', 'error', 'already-verified', 'expired', 'server-error'];
      
      types.forEach(type => {
        const html = generateEmailVerificationHTML(type, 'ja');
        
        // 基本的なHTML構造が正しいことを確認
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('<html>');
        expect(html).toContain('</html>');
        
        // XSS攻撃ベクトルが含まれていないことを確認
        expect(html).not.toContain('javascript:');
        expect(html).not.toContain('onerror=');
        expect(html).not.toContain('onload=');
      });
    });

    it('should handle missing or invalid locale', () => {
      // 無効なロケールでもエラーにならないことを確認
      const html1 = generateEmailVerificationHTML('error', 'invalid' as any);
      expect(html1).toContain('Error'); // デフォルトで英語になるはず

      const html2 = generateEmailVerificationHTML('error', null as any);
      expect(html2).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('should handle extremely long input', () => {
      const longString = 'x'.repeat(10000);
      const data = {
        userInfo: { name: longString },
        accessToken: longString,
        refreshToken: longString
      };

      const html = generateEmailVerificationHTML('success', 'ja', data);
      expect(html).toBeTruthy();
      expect(html.length).toBeGreaterThan(0);
    });

    it('should handle special Unicode characters', () => {
      const unicodeData = {
        userInfo: { 
          name: '🚀<script>alert("emoji")</script>💉',
          email: 'user@例え.jp'
        },
        accessToken: 'token-με-ελληνικά',
        refreshToken: 'токен-с-кириллицей'
      };

      const html = generateEmailVerificationHTML('success', 'ja', unicodeData);
      
      // Unicodeは保持されるが悪意のあるスクリプトタグは除去される
      expect(html).toContain('🚀');
      expect(html).toContain('💉');
      expect(html).not.toContain('<script>alert("emoji")');
    });
  });
});