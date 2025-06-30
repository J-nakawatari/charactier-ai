import { test, expect } from '@playwright/test';

test.describe('authaccountmanagement - newmemberregister', () => {
  test('忁E��頁E��の入力チェチE��', async ({ page }) => {
    // 新規登録ペ�Eジに移勁E
    await page.goto('/ja/register');
    
    // ペ�Eジが読み込まれたことを確誁E
    await page.waitForLoadState('networkidle');
    
    // 何も入力せずに登録ボタンをクリチE��
    await page.locator('button[type="submit"]').click();
    
    // カスタムエラーメチE��ージが表示されることを確誁E
    await expect(page.getByText('忁E��頁E��を�E力してください').first()).toBeVisible();
    
    // 褁E��のエラーメチE��ージが表示されてぁE��ことを確誁E
    const errorMessages = await page.locator('text=忁E��頁E��を�E力してください').count();
    expect(errorMessages).toBeGreaterThan(0);
  });
  
  test('正常な新規登録フロー', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;
    
    // 新規登録ペ�Eジに移勁E
    await page.goto('/ja/register');
    
    // フォームに入劁E
    await page.locator('#email').fill(testEmail);
    await page.locator('#password').fill('Test123!');
    await page.locator('#confirmPassword').fill('Test123!');
    
    // 登録ボタンをクリチE��
    await page.locator('button[type="submit"]').click();
    
    // 登録完亁E�Eージへのリダイレクトを確誁E
    await page.waitForURL('**/register-complete', { timeout: 10000 });
    
    // 成功メチE��ージまた�Eペ�Eジが表示されることを確誁E
    await expect(page.locator('body')).toBeVisible();
  });
});

