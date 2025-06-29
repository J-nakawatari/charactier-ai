import { test, expect } from '@playwright/test';

test.describe('authaccountmanagement - login', () => {
  test('正しい認証情報でのログイン成功', async ({ page }) => {
    // まず新規登録でテストユーザーを作成
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;
    const testPassword = 'Test123!';
    
    // 新規登録
    await page.goto('/ja/register');
    await page.locator('#email').fill(testEmail);
    await page.locator('#password').fill(testPassword);
    await page.locator('#confirmPassword').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    
    // 登録完了を待つ
    await page.waitForURL('**/register-complete', { timeout: 10000 });
    
    // ログインページに移動
    await page.goto('/ja/login');
    
    // ログインフォームに入力
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    
    // ログインボタンをクリック
    await page.locator('button[type="submit"]').click();
    
    // ダッシュボードまたはセットアップページへのリダイレクトを待つ
    await page.waitForURL((url) => {
      return url.pathname.includes('/dashboard') || url.pathname.includes('/setup');
    }, { timeout: 10000 });
    
    // ページが正常に表示されることを確認
    await expect(page.locator('body')).toBeVisible();
  });
});
