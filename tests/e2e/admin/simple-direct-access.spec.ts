import { test, expect } from '@playwright/test';

test.describe('シンプルな直接アクセステスト', () => {
  test('ログイン後、直接URLでページを確認', async ({ page }) => {
    // ログイン
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // ダッシュボードを待つ
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('✅ ログイン完了');
    
    // 長めに待機
    await page.waitForTimeout(5000);
    
    // 各ページを順番に確認（JavaScriptで遷移）
    const pages = [
      { url: '/admin/dashboard', name: 'ダッシュボード' },
      { url: '/admin/characters', name: 'キャラクター一覧' },
      { url: '/admin/characters/new', name: 'キャラクター作成' }
    ];
    
    for (const pageInfo of pages) {
      console.log(`\n📄 ${pageInfo.name}を確認中...`);
      
      // JavaScriptで直接遷移（ナビゲーション競合を回避）
      await page.evaluate((url) => {
        window.location.href = url;
      }, pageInfo.url);
      
      // ページの読み込みを待つ
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      console.log(`- URL: ${currentUrl}`);
      console.log(`- 期待したページ: ${currentUrl.includes(pageInfo.url) ? '✅' : '❌'}`);
      
      // 基本的な要素をカウント
      const elements = {
        'input': await page.locator('input').count(),
        'button': await page.locator('button').count(),
        'form': await page.locator('form').count()
      };
      
      console.log('- 要素数:', elements);
      
      // スクリーンショット
      await page.screenshot({ path: `${pageInfo.name.replace('/', '-')}.png` });
    }
  });
  
  test('認証状態の確認', async ({ page }) => {
    // デバッグエンドポイントがあれば確認
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // 認証状態を確認
    const response = await page.request.get('/api/v1/debug/auth-status').catch(() => null);
    if (response && response.ok()) {
      const authStatus = await response.json();
      console.log('認証状態:', authStatus);
    }
    
    // Cookieを確認
    const cookies = await page.context().cookies();
    console.log('Cookies:', cookies.map(c => ({ name: c.name, httpOnly: c.httpOnly, secure: c.secure })));
  });
});