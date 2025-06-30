import { test, expect } from '@playwright/test';

test.describe('レート制限�E状態確誁E, () => {
  test('レート制限が無効化されてぁE��か確誁E, async ({ page }) => {
    console.log('🔍 レート制限�E状態を確認しまぁE);
    console.log('環墁E��数 DISABLE_RATE_LIMIT:', process.env.DISABLE_RATE_LIMIT);
    
    // チE��チE��用エンド�Eイントにアクセス�E�存在する場合！E
    const debugResponse = await page.request.get('/api/v1/debug/rate-limit-status').catch(() => null);
    if (debugResponse && debugResponse.ok()) {
      const status = await debugResponse.json();
      console.log('レート制限�E状慁E', status);
    }
    
    // ログインを褁E��回試衁E
    for (let i = 0; i < 3; i++) {
      console.log(`\n試衁E${i + 1}/3:`);
      
      await page.goto('/admin/login');
      await page.fill('input[type="email"]', 'admin@example.com');
      await page.fill('input[type="password"]', 'admin123');
      
      const responsePromise = page.waitForResponse(response => 
        response.url().includes('/api/v1/auth/admin/login')
      );
      
      await page.click('button[type="submit"]');
      const response = await responsePromise;
      
      console.log(`- スチE�Eタス: ${response.status()}`);
      console.log(`- レート制限�EチE��ー:`, {
        'X-RateLimit-Limit': response.headers()['x-ratelimit-limit'],
        'X-RateLimit-Remaining': response.headers()['x-ratelimit-remaining'],
        'Retry-After': response.headers()['retry-after']
      });
      
      if (response.status() === 429) {
        const body = await response.json();
        console.log('- エラー:', body.message);
        console.log('\n❁Eレート制限が有効になってぁE��す！E);
        console.log('以下�Eコマンドでバックエンドを再起動してください:');
        console.log('cd backend && npm run dev:test');
        break;
      } else if (response.ok()) {
        console.log('- ✁Eログイン成功');
        await page.waitForURL('**/admin/dashboard', { timeout: 5000 }).catch(() => {});
      }
      
      // 次の試行まで少し征E��
      await page.waitForTimeout(1000);
    }
  });
});
