import { test, expect } from '@playwright/test';

test.describe('管理画面ログインデバッグ', () => {
  test('ログインページの表示確認', async ({ page }) => {
    console.log('1. /admin/loginへアクセス');
    await page.goto('/admin/login');
    
    // スクリーンショットを撮る
    await page.screenshot({ path: 'admin-login-page.png' });
    
    // ページのタイトルやURLを確認
    console.log('現在のURL:', page.url());
    console.log('ページタイトル:', await page.title());
    
    // ログインフォームが存在するか確認
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    console.log('メール入力欄:', await emailInput.isVisible());
    console.log('パスワード入力欄:', await passwordInput.isVisible());
    console.log('送信ボタン:', await submitButton.isVisible());
    
    // 実際に見つかった要素を表示
    const allInputs = await page.locator('input').all();
    console.log(`入力フィールド数: ${allInputs.length}`);
    
    const allButtons = await page.locator('button').all();
    console.log(`ボタン数: ${allButtons.length}`);
  });
  
  test('ログイン処理の確認', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    // より柔軟なセレクターを試す
    const emailInput = page.locator('input[type="email"], input[name="email"], input#email').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input#password').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")').first();
    
    if (await emailInput.isVisible()) {
      console.log('メールアドレスを入力');
      await emailInput.fill('admin-test@example.com');
    } else {
      console.log('メール入力欄が見つかりません');
      // ページの内容を出力
      console.log(await page.content());
    }
    
    if (await passwordInput.isVisible()) {
      console.log('パスワードを入力');
      await passwordInput.fill('Test123!');
    }
    
    if (await submitButton.isVisible()) {
      console.log('ログインボタンをクリック');
      await submitButton.click();
      
      // ログイン後の遷移を待つ
      try {
        await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
        console.log('ダッシュボードへの遷移成功');
      } catch (e) {
        console.log('ダッシュボードへの遷移失敗');
        console.log('現在のURL:', page.url());
        await page.screenshot({ path: 'admin-after-login.png' });
      }
    }
  });
});