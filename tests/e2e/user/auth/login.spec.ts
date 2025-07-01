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
    
    // ログイン結果を確認
    try {
      // ダッシュボードへのリダイレクトを確認（30秒待機）
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
      console.log('✅ ダッシュボードへリダイレクト成功');
    } catch {
      // 現在のURLを確認
      const currentUrl = page.url();
      console.log('現在のURL:', currentUrl);
      
      // ページの内容を確認してデバッグ
      const pageTitle = await page.title();
      console.log('ページタイトル:', pageTitle);
      
      // エラーメッセージがあるか確認
      const bodyText = await page.textContent('body');
      if (bodyText?.includes('メール') || bodyText?.includes('認証')) {
        console.log('⚠️ メール認証が必要な可能性があります');
      }
      
      throw new Error(`ダッシュボードへのリダイレクトが失敗しました。URL: ${currentUrl}`);
    }
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