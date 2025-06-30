import { test, expect } from '@playwright/test';

test.describe('チャット機能', () => {
  test.beforeEach(async ({ page }) => {
    // テストユーザーでログイン
    await page.goto('/ja/login');
    await page.getByLabel('メールアドレス').fill('global-test@example.com');
    await page.getByLabel('パスワード').fill('Test123!');
    await page.getByRole('button', { name: 'ログインする' }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test('キャラクターとのチャット開始', async ({ page }) => {
    // キャラクター一覧へ
    await page.goto('/ja/characters');
    
    // 無料キャラクターを選択
    await page.getByText('無料テストキャラクター').click();
    
    // チャット開始ボタンをクリック
    await page.getByRole('button', { name: /チャットを開始|話す/ }).click();
    
    // チャット画面が表示されることを確認
    await expect(page).toHaveURL(/\/chat\//);
    
    // 入力欄が表示されることを確認
    await expect(page.getByPlaceholder(/メッセージを入力|話しかけてみよう/)).toBeVisible();
  });

  test('メッセージの送信', async ({ page }) => {
    // 無料キャラクターのチャット画面へ直接遷移
    await page.goto('/ja/chat/free-test-character');
    
    // メッセージを入力
    const messageInput = page.getByPlaceholder(/メッセージを入力|話しかけてみよう/);
    await messageInput.fill('こんにちは！');
    
    // 送信ボタンをクリック
    await page.getByRole('button', { name: /送信|Send/ }).click();
    
    // メッセージが表示されることを確認
    await expect(page.getByText('こんにちは！')).toBeVisible();
    
    // 返信を待つ（AIの応答には時間がかかる）
    await page.waitForTimeout(5000);
    
    // キャラクターからの返信があることを確認
    const messages = page.locator('.message-bubble');
    await expect(messages).toHaveCount(2); // ユーザーとキャラクターのメッセージ
  });
});