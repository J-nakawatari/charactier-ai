import { test, expect } from '@playwright/test';

test.describe('authaccountmanagement - newmemberregister', () => {
  test('必須項目の入力チェック', async ({ page }) => {
    // 新規登録ページに移動
    await page.goto('/ja/register');
    
    // ページが読み込まれたことを確認
    await page.waitForLoadState('networkidle');
    
    // 何も入力せずに登録ボタンをクリック
    await page.locator('button[type="submit"]').click();
    
    // カスタムエラーメッセージが表示されることを確認
    await expect(page.getByText('必須項目を入力してください').first()).toBeVisible();
    
    // 複数のエラーメッセージが表示されていることを確認
    const errorMessages = await page.locator('text=必須項目を入力してください').count();
    expect(errorMessages).toBeGreaterThan(0);
  });
  
  test('正常な新規登録フロー', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;
    
    // 新規登録ページに移動
    await page.goto('/ja/register');
    
    // フォームに入力
    await page.locator('#email').fill(testEmail);
    await page.locator('#password').fill('Test123!');
    await page.locator('#confirmPassword').fill('Test123!');
    
    // 登録ボタンをクリック
    await page.locator('button[type="submit"]').click();
    
    // 登録完了ページへのリダイレクトを確認
    await page.waitForURL('**/register-complete', { timeout: 10000 });
    
    // 成功メッセージまたはページが表示されることを確認
    await expect(page.locator('body')).toBeVisible();
  });
});
