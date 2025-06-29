import { test, expect } from '@playwright/test';

test.describe('レート制限を考慮したテスト', () => {
  // テスト間に十分な待機時間を設ける
  test.beforeEach(async () => {
    // 各テストの前に3秒待機（レート制限リセット）
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  test('レート制限を回避してログイン', async ({ page }) => {
    console.log('🚀 レート制限対策済みテスト開始');
    
    // ログインページへ（ゆっくり）
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 追加の待機
    
    // ログイン情報を入力
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.waitForTimeout(500); // 入力間隔をあける
    
    await page.fill('input[type="password"]', 'admin123');
    await page.waitForTimeout(500);
    
    // APIレスポンスを監視
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/auth/admin/login')
    );
    
    // ログイン
    await page.click('button[type="submit"]');
    
    // レスポンスを確認
    const response = await responsePromise;
    console.log('APIレスポンス:', response.status());
    
    if (response.status() === 429) {
      console.log('❌ レート制限エラー');
      const headers = response.headers();
      console.log('Retry-After:', headers['retry-after']);
      console.log('X-RateLimit-Reset:', headers['x-ratelimit-reset']);
      
      // エラー内容を表示
      const body = await response.json();
      console.log('エラー詳細:', body);
      
      throw new Error('レート制限に達しました。DISABLE_RATE_LIMIT=true でバックエンドを起動してください。');
    }
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('✅ ログイン成功');
    
    // 十分な待機
    await page.waitForTimeout(5000);
    
    // キャラクター作成ページへ
    await page.evaluate(() => {
      window.location.href = '/admin/characters/new';
    });
    
    await page.waitForURL('**/admin/characters/new', { timeout: 10000 });
    console.log('✅ キャラクター作成ページに到達');
    
    // フォーム確認
    const hasForm = await page.locator('input[type="text"]').count() > 0;
    expect(hasForm).toBeTruthy();
  });
});