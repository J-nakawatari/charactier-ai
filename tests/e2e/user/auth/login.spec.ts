import { test, expect } from '@playwright/test';

test.describe('ユーザーログイン', () => {
  test('正しい認証情報でログイン成功', async ({ page }) => {
    // テスト用ユーザーでログイン
    await page.goto('/ja/login');
    
    // フォームに入力
    await page.getByLabel('メールアドレス').fill('global-test@example.com');
    await page.getByLabel('パスワード').fill('Test123!');
    
    // ログインボタンをクリック
    await page.getByRole('button', { name: 'ログインする' }).click();
    
    // ダッシュボードへのリダイレクトを確認
    await expect(page).toHaveURL(/\/dashboard/);
    
    // ユーザー名が表示されることを確認
    await expect(page.getByText('テストユーザー')).toBeVisible();
  });

  test('誤った認証情報でエラー表示', async ({ page }) => {
    await page.goto('/ja/login');
    
    await page.getByLabel('メールアドレス').fill('wrong@example.com');
    await page.getByLabel('パスワード').fill('wrong');
    
    await page.getByRole('button', { name: 'ログインする' }).click();
    
    // エラーメッセージを確認
    await expect(page.getByText(/認証に失敗しました|メールアドレスまたはパスワードが正しくありません/)).toBeVisible();
  });
});