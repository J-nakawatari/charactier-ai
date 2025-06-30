import { test, expect } from '@playwright/test';

test.describe('シンプルな直接アクセスチE��チE, () => {
  test('ログイン後、直接URLでペ�Eジを確誁E, async ({ page }) => {
    // ログイン
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // ダチE��ュボ�Eドを征E��
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('✁Eログイン完亁E);
    
    // 長めに征E��E
    await page.waitForTimeout(5000);
    
    // 吁E�Eージを頁E��に確認！EavaScriptで遷移�E�E
    const pages = [
      { url: '/admin/dashboard', name: 'ダチE��ュボ�EチE },
      { url: '/admin/characters', name: 'キャラクター一覧' },
      { url: '/admin/characters/new', name: 'キャラクター作�E' }
    ];
    
    for (const pageInfo of pages) {
      console.log(`\n📄 ${pageInfo.name}を確認中...`);
      
      // JavaScriptで直接遷移�E�ナビゲーション競合を回避�E�E
      await page.evaluate((url) => {
        window.location.href = url;
      }, pageInfo.url);
      
      // ペ�Eジの読み込みを征E��
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      console.log(`- URL: ${currentUrl}`);
      console.log(`- 期征E��た�Eージ: ${currentUrl.includes(pageInfo.url) ? '✁E : '❁E}`);
      
      // 基本皁E��要素をカウンチE
      const elements = {
        'input': await page.locator('input').count(),
        'button': await page.locator('button').count(),
        'form': await page.locator('form').count()
      };
      
      console.log('- 要素数:', elements);
      
      // スクリーンショチE��
      await page.screenshot({ path: `${pageInfo.name.replace('/', '-')}.png` });
    }
  });
  
  test('認証状態�E確誁E, async ({ page }) => {
    // チE��チE��エンド�Eイントがあれば確誁E
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // 認証状態を確誁E
    const response = await page.request.get('/api/v1/debug/auth-status').catch(() => null);
    if (response && response.ok()) {
      const authStatus = await response.json();
      console.log('認証状慁E', authStatus);
    }
    
    // Cookieを確誁E
    const cookies = await page.context().cookies();
    console.log('Cookies:', cookies.map(c => ({ name: c.name, httpOnly: c.httpOnly, secure: c.secure })));
  });
});
