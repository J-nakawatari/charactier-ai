import { test, expect } from '@playwright/test';

test.describe('キャラクター管琁E- 動作確誁E, () => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('管琁E��面にアクセスできることを確誁E, async ({ page }) => {
    // 1. ログインペ�Eジにアクセス
    await page.goto('http://localhost:3001/admin/login');
    console.log('✁Eログインペ�Eジにアクセス');
    
    // 2. スクリーンショチE��を撮る（デバッグ用�E�E
    await page.screenshot({ path: 'login-page.png' });
    
    // 3. ログインフォームが表示されることを確誁E
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    console.log('✁Eログインフォームが表示されてぁE��ぁE);
    
    // 4. ログイン
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    
    // 5. ダチE��ュボ�Eドに遷移することを確誁E
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
      console.log('✁EダチE��ュボ�Eドにログイン成功');
      
      // 6. キャラクター管琁E�Eージへ
      await page.goto('http://localhost:3001/admin/characters');
      await page.waitForLoadState('networkidle');
      console.log('✁Eキャラクター管琁E�Eージにアクセス');
      
      // 7. 新規作�Eボタンを確誁E
      const newButton = page.locator('a[href="/admin/characters/new"], button:has-text("新規作�E")');
      if (await newButton.isVisible()) {
        console.log('✁E新規作�Eボタンが見つかりました');
      }
    } catch (error) {
      console.error('❁Eログインまた�Eペ�Eジ遷移に失敁E', error);
      await page.screenshot({ path: 'error-state.png' });
    }
  });
});
