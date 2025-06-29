import { Page } from '@playwright/test';

export class SecurityTestHelper {
  constructor(private page: Page) {}

  // XSS攻撃のテスト
  async testXSSVulnerability(selector: string) {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '"><script>alert("XSS")</script>',
      '\';alert("XSS");//',
      '<script>document.cookie</script>',
    ];

    for (const payload of xssPayloads) {
      await this.page.fill(selector, payload);
      await this.page.keyboard.press('Enter');
      
      // スクリプトが実行されていないことを確認
      const alertDialog = this.page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
      if (await alertDialog) {
        throw new Error(`XSS vulnerability detected with payload: ${payload}`);
      }
      
      // 入力がサニタイズされていることを確認
      const content = await this.page.textContent('body');
      if (content?.includes('<script>') && !content.includes('&lt;script&gt;')) {
        throw new Error(`Unescaped script tag found with payload: ${payload}`);
      }
    }
  }

  // SQLインジェクションのテスト
  async testSQLInjection(selector: string) {
    const sqlPayloads = [
      "' OR '1'='1",
      "1' OR '1' = '1",
      "' OR 1=1--",
      "admin'--",
      "' UNION SELECT * FROM users--",
      "1'; DROP TABLE users--",
    ];

    for (const payload of sqlPayloads) {
      await this.page.fill(selector, payload);
      await this.page.keyboard.press('Enter');
      
      // エラーページやデータベースエラーが表示されていないことを確認
      const errorIndicators = [
        'SQL syntax',
        'mysql_fetch',
        'Warning: mysql',
        'valid MySQL result',
        'MySqlClient.',
        'PostgreSQL query failed',
        'Warning: pg_',
        'valid PostgreSQL result',
        'MongoDB error',
        'MongoError',
      ];
      
      const pageContent = await this.page.textContent('body');
      for (const indicator of errorIndicators) {
        if (pageContent?.toLowerCase().includes(indicator.toLowerCase())) {
          throw new Error(`Potential SQL injection vulnerability: ${indicator} found`);
        }
      }
    }
  }

  // CSRF保護のテスト
  async testCSRFProtection() {
    // CSRFトークンなしでPOSTリクエストを送信
    const response = await this.page.evaluate(async () => {
      const res = await fetch('/api/v1/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Hacked' }),
        credentials: 'include',
      });
      return {
        status: res.status,
        text: await res.text(),
      };
    });

    if (response.status !== 403) {
      throw new Error('CSRF protection not working: Request should be rejected');
    }
  }

  // 認証バイパスのテスト
  async testAuthBypass() {
    // 認証なしで保護されたページにアクセス
    await this.page.goto('/ja/dashboard');
    
    // ログインページにリダイレクトされることを確認
    await this.page.waitForURL(/\/auth\/login/, { timeout: 5000 });
    
    // LocalStorageの改ざんを試みる
    await this.page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({ id: '1', role: 'admin' }));
      localStorage.setItem('token', 'fake-token');
    });
    
    // 再度アクセス
    await this.page.goto('/ja/dashboard');
    
    // まだログインページにいることを確認
    const url = this.page.url();
    if (!url.includes('/auth/login')) {
      throw new Error('Authentication bypass vulnerability detected');
    }
  }

  // レート制限のテスト
  async testRateLimit(endpoint: string, limit: number = 100) {
    const requests = [];
    
    // 制限数以上のリクエストを送信
    for (let i = 0; i < limit + 10; i++) {
      requests.push(
        this.page.evaluate(async (url) => {
          const res = await fetch(url);
          return res.status;
        }, endpoint)
      );
    }
    
    const results = await Promise.all(requests);
    const rateLimitedRequests = results.filter(status => status === 429);
    
    if (rateLimitedRequests.length === 0) {
      throw new Error('Rate limiting not working: No 429 responses received');
    }
  }

  // ファイルアップロードの検証
  async testFileUploadSecurity(selector: string) {
    const maliciousFiles = [
      { name: 'shell.php', content: '<?php system($_GET["cmd"]); ?>', type: 'application/x-php' },
      { name: 'script.js', content: 'alert("XSS")', type: 'text/javascript' },
      { name: 'test.exe', content: 'MZ\x90\x00', type: 'application/x-msdownload' },
    ];
    
    for (const file of maliciousFiles) {
      // 悪意のあるファイルを作成
      const buffer = Buffer.from(file.content);
      const dataTransfer = await this.page.evaluateHandle((data) => {
        const dt = new DataTransfer();
        const file = new File([new Uint8Array(data.buffer)], data.name, { type: data.type });
        dt.items.add(file);
        return dt;
      }, { buffer: Array.from(buffer), name: file.name, type: file.type });
      
      // ファイルをアップロード
      await this.page.dispatchEvent(selector, 'drop', { dataTransfer });
      
      // エラーメッセージを確認
      await this.page.waitForTimeout(1000);
      const errorMessage = await this.page.textContent('.error-message');
      
      if (!errorMessage || !errorMessage.includes('許可されていないファイル形式')) {
        throw new Error(`Dangerous file upload allowed: ${file.name}`);
      }
    }
  }
}