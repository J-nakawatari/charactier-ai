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
    
    // 登録結果を確認
    try {
      // 成功メッセージまたはリダイレクトを確認
      const successPatterns = [
        /登録が完了しました/,
        /確認メールを送信しました/,
        /メールをご確認ください/,
        /登録完了/
      ];
      
      let success = false;
      for (const pattern of successPatterns) {
        if (await page.getByText(pattern).isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log(`✅ 成功メッセージを確認: ${pattern}`);
          success = true;
          break;
        }
      }
      
      if (!success) {
        // URLの変化を確認
        const currentUrl = page.url();
        if (currentUrl.includes('complete') || currentUrl.includes('success')) {
          console.log(`✅ 成功URLへ遷移: ${currentUrl}`);
          success = true;
        }
      }
      
      if (!success) {
        throw new Error('登録完了の確認ができませんでした');
      }
    } catch (error) {
      // デバッグ情報を出力
      const currentUrl = page.url();
      console.log('エラー時のURL:', currentUrl);
      console.log('ページタイトル:', await page.title());
      
      // スクリーンショットを撮影
      await page.screenshot({ path: 'register-error.png' });
      
      throw error;
    }
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