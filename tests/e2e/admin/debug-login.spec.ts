import { test, expect } from '@playwright/test';

test.describe('管琁E��面ログインチE��チE��', () => {
  test('ログインペ�Eジの表示確誁E, async ({ page }) => {
    console.log('1. /admin/loginへアクセス');
    await page.goto('/admin/login');
    
    // スクリーンショチE��を撮めE
    await page.screenshot({ path: 'admin-login-page.png' });
    
    // ペ�EジのタイトルやURLを確誁E
    console.log('現在のURL:', page.url());
    console.log('ペ�Eジタイトル:', await page.title());
    
    // ログインフォームが存在するか確誁E
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    console.log('メール入力欁E', await emailInput.isVisible());
    console.log('パスワード�E力欁E', await passwordInput.isVisible());
    console.log('送信ボタン:', await submitButton.isVisible());
    
    // 実際に見つかった要素を表示
    const allInputs = await page.locator('input').all();
    console.log(`入力フィールド数: ${allInputs.length}`);
    
    const allButtons = await page.locator('button').all();
    console.log(`ボタン数: ${allButtons.length}`);
  });
  
  test('ログイン処琁E�E確誁E, async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    // より柔軟なセレクターを試ぁE
    const emailInput = page.locator('input[type="email"], input[name="email"], input#email').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input#password').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")').first();
    
    if (await emailInput.isVisible()) {
      console.log('メールアドレスを�E劁E);
      await emailInput.fill('admin-test@example.com');
    } else {
      console.log('メール入力欁E��見つかりません');
      // ペ�Eジの冁E��を�E劁E
      console.log(await page.content());
    }
    
    if (await passwordInput.isVisible()) {
      console.log('パスワードを入劁E);
      await passwordInput.fill('Test123!');
    }
    
    if (await submitButton.isVisible()) {
      console.log('ログインボタンをクリチE��');
      await submitButton.click();
      
      // ログイン後�E遷移を征E��
      try {
        await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
        console.log('ダチE��ュボ�Eドへの遷移成功');
      } catch (e) {
        console.log('ダチE��ュボ�Eドへの遷移失敁E);
        console.log('現在のURL:', page.url());
        await page.screenshot({ path: 'admin-after-login.png' });
      }
    }
  });
});
