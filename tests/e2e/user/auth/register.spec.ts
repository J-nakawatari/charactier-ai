import { test, expect } from '@playwright/test';

test.describe('新規会員登録', () => {
  test('新規登録フォームの表示と入力', async ({ page }) => {
    const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substring(2, 15)}@example.com`;
    const password = 'TestPass123!';
    
    // 登録ページへ
    await page.goto('/ja/register');
    
    // フォームに入力
    await page.getByLabel('メールアドレス').fill(uniqueEmail);
    await page.getByLabel('パスワード', { exact: true }).fill(password);
    await page.getByLabel('パスワード確認').fill(password);
    
    // 利用規約に同意して登録
    await page.getByRole('button', { name: '利用規約に同意して登録する' }).click();
    
    // 登録完了メッセージまたはメール確認画面を確認
    await expect(page.getByText(/登録が完了しました|確認メールを送信しました/)).toBeVisible({ timeout: 10000 });
  });

  test('パスワード不一致でエラー', async ({ page }) => {
    await page.goto('/ja/register');
    
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await page.getByLabel('パスワード', { exact: true }).fill('Password123!');
    await page.getByLabel('パスワード確認').fill('Different123!');
    
    await page.getByRole('button', { name: '利用規約に同意して登録する' }).click();
    
    // エラーメッセージを確認
    await expect(page.getByText('パスワードが一致しません')).toBeVisible();
  });
});