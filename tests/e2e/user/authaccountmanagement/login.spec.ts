import { test, expect } from '@playwright/test';

test.describe('authaccountmanagement - login', () => {
  test('正しい認証情報でのログイン成功', async ({ page }) => {
    // ログインページに移動
    await page.goto('/ja/auth/login');
    
    // ログインフォームが表示されることを確認
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
    
    // テスト用のログイン情報を入力
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await page.getByLabel('パスワード').fill('Test123!');
    
    // ログインボタンをクリック
    await page.getByRole('button', { name: 'ログイン' }).click();
    
    // ダッシュボードにリダイレクトされることを確認
    await page.waitForURL('/ja/dashboard');
    
    // ダッシュボードが表示されることを確認
    await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
    
    // ユーザー名が表示されることを確認（テストユーザーの名前）
    await expect(page.getByText('テストユーザー')).toBeVisible();
  });
});
