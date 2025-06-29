import { test, expect } from '@playwright/test';

test.describe('レート制限の状態確認', () => {
  test('レート制限が無効化されているか確認', async ({ page }) => {
    console.log('🔍 レート制限の状態を確認します');
    console.log('環境変数 DISABLE_RATE_LIMIT:', process.env.DISABLE_RATE_LIMIT);
    
    // デバッグ用エンドポイントにアクセス（存在する場合）
    const debugResponse = await page.request.get('/api/v1/debug/rate-limit-status').catch(() => null);
    if (debugResponse && debugResponse.ok()) {
      const status = await debugResponse.json();
      console.log('レート制限の状態:', status);
    }
    
    // ログインを複数回試行
    for (let i = 0; i < 3; i++) {
      console.log(`\n試行 ${i + 1}/3:`);
      
      await page.goto('/admin/login');
      await page.fill('input[type="email"]', 'admin@example.com');
      await page.fill('input[type="password"]', 'admin123');
      
      const responsePromise = page.waitForResponse(response => 
        response.url().includes('/api/v1/auth/admin/login')
      );
      
      await page.click('button[type="submit"]');
      const response = await responsePromise;
      
      console.log(`- ステータス: ${response.status()}`);
      console.log(`- レート制限ヘッダー:`, {
        'X-RateLimit-Limit': response.headers()['x-ratelimit-limit'],
        'X-RateLimit-Remaining': response.headers()['x-ratelimit-remaining'],
        'Retry-After': response.headers()['retry-after']
      });
      
      if (response.status() === 429) {
        const body = await response.json();
        console.log('- エラー:', body.message);
        console.log('\n❌ レート制限が有効になっています！');
        console.log('以下のコマンドでバックエンドを再起動してください:');
        console.log('cd backend && npm run dev:test');
        break;
      } else if (response.ok()) {
        console.log('- ✅ ログイン成功');
        await page.waitForURL('**/admin/dashboard', { timeout: 5000 }).catch(() => {});
      }
      
      // 次の試行まで少し待つ
      await page.waitForTimeout(1000);
    }
  });
});