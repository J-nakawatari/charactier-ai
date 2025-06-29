import { test, expect } from '@playwright/test';

test.describe('authaccountmanagement - newmemberregister', () => {
  test('必須項目の入力チェック', async ({ page }) => {
    // 新規登録ページに移動
    await page.goto('/ja/register');
    
    // ページが読み込まれたことを確認
    await expect(page.getByRole('heading', { name: '新規登録' })).toBeVisible();
    
    // 何も入力せずに登録ボタンをクリック
    await page.getByRole('button', { name: '登録' }).click();
    
    // エラーメッセージが表示されることを確認
    await expect(page.getByText('名前は必須です')).toBeVisible();
    await expect(page.getByText('メールアドレスは必須です')).toBeVisible();
    await expect(page.getByText('パスワードは必須です')).toBeVisible();
    
    // 利用規約のチェックがされていないエラー
    await expect(page.getByText('利用規約に同意してください')).toBeVisible();
  });
});
