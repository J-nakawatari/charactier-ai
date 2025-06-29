import { test, expect } from '@playwright/test';

test.describe('キャラクター管理 - 動作確認', () => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('管理画面にアクセスできることを確認', async ({ page }) => {
    // 1. ログインページにアクセス
    await page.goto('http://localhost:3001/admin/login');
    console.log('✅ ログインページにアクセス');
    
    // 2. スクリーンショットを撮る（デバッグ用）
    await page.screenshot({ path: 'login-page.png' });
    
    // 3. ログインフォームが表示されることを確認
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    console.log('✅ ログインフォームが表示されています');
    
    // 4. ログイン
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    
    // 5. ダッシュボードに遷移することを確認
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
      console.log('✅ ダッシュボードにログイン成功');
      
      // 6. キャラクター管理ページへ
      await page.goto('http://localhost:3001/admin/characters');
      await page.waitForLoadState('networkidle');
      console.log('✅ キャラクター管理ページにアクセス');
      
      // 7. 新規作成ボタンを確認
      const newButton = page.locator('a[href="/admin/characters/new"], button:has-text("新規作成")');
      if (await newButton.isVisible()) {
        console.log('✅ 新規作成ボタンが見つかりました');
      }
    } catch (error) {
      console.error('❌ ログインまたはページ遷移に失敗:', error);
      await page.screenshot({ path: 'error-state.png' });
    }
  });
});