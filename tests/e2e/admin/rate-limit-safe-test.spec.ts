import { test, expect } from '@playwright/test';

test.describe('レート制限を老E�EしたチE��チE, () => {
  // チE��ト間に十�Eな征E��時間を設ける
  test.beforeEach(async () => {
    // 吁E��スト�E前に3秒征E��（レート制限リセチE���E�E
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  test('レート制限を回避してログイン', async ({ page }) => {
    console.log('🚀 レート制限対策済みチE��ト開姁E);
    
    // ログインペ�Eジへ�E�ゆっくり�E�E
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 追加の征E��E
    
    // ログイン惁E��を�E劁E
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.waitForTimeout(500); // 入力間隔をあけめE
    
    await page.fill('input[type="password"]', 'admin123');
    await page.waitForTimeout(500);
    
    // APIレスポンスを監要E
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/auth/admin/login')
    );
    
    // ログイン
    await page.click('button[type="submit"]');
    
    // レスポンスを確誁E
    const response = await responsePromise;
    console.log('APIレスポンス:', response.status());
    
    if (response.status() === 429) {
      console.log('❁Eレート制限エラー');
      const headers = response.headers();
      console.log('Retry-After:', headers['retry-after']);
      console.log('X-RateLimit-Reset:', headers['x-ratelimit-reset']);
      
      // エラー冁E��を表示
      const body = await response.json();
      console.log('エラー詳細:', body);
      
      throw new Error('レート制限に達しました、EISABLE_RATE_LIMIT=true でバックエンドを起動してください、E);
    }
    
    // ダチE��ュボ�Eドへの遷移を征E��
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('✁Eログイン成功');
    
    // 十�Eな征E��E
    await page.waitForTimeout(5000);
    
    // キャラクター作�Eペ�Eジへ
    await page.evaluate(() => {
      window.location.href = '/admin/characters/new';
    });
    
    await page.waitForURL('**/admin/characters/new', { timeout: 10000 });
    console.log('✁Eキャラクター作�Eペ�Eジに到遁E);
    
    // フォーム確誁E
    const hasForm = await page.locator('input[type="text"]').count() > 0;
    expect(hasForm).toBeTruthy();
  });
});
