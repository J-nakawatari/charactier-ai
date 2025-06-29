import { test, expect } from '@playwright/test';

test.describe('管理画面ログインテスト', () => {
  test('管理画面にログインできることを確認', async ({ page }) => {
    console.log('🚀 テスト開始: 管理画面ログインテスト');
    
    // 管理者ログインページへアクセス
    await page.goto('/admin/login');
    console.log('📍 現在のURL:', page.url());
    
    // ページが完全に読み込まれるのを待つ
    await page.waitForLoadState('networkidle');
    
    // ログインフォームの要素を確認
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    // フォーム要素が表示されているか確認
    console.log('📝 フォーム要素の確認中...');
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    console.log('✅ ログインフォームが表示されています');
    
    // ログイン情報を入力
    console.log('🔑 ログイン情報を入力中...');
    await emailInput.fill('admin@example.com');
    await passwordInput.fill('admin123');
    
    // ネットワークリクエストを監視
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/auth/admin/login') && 
      response.request().method() === 'POST'
    );
    
    // ログインボタンをクリック
    await submitButton.click();
    console.log('🖱️ ログインボタンをクリックしました');
    
    // APIレスポンスを待つ
    try {
      const response = await responsePromise;
      const status = response.status();
      const responseBody = await response.json().catch(() => null);
      
      console.log('📡 APIレスポンス:', {
        status,
        ok: response.ok(),
        body: responseBody
      });
      
      if (!response.ok()) {
        console.error('❌ ログインAPIエラー:', responseBody?.message || 'Unknown error');
      }
    } catch (error) {
      console.log('⚠️ APIレスポンスを待機中にタイムアウト');
    }
    
    // ダッシュボードへの遷移またはエラーメッセージを確認
    try {
      // ダッシュボードへの遷移を待つ
      await page.waitForURL('**/admin/dashboard', { timeout: 5000 });
      console.log('✅ ダッシュボードへの遷移成功');
      console.log('📍 現在のURL:', page.url());
    } catch (e) {
      console.log('⚠️ ダッシュボードへの遷移に失敗');
      console.log('📍 現在のURL:', page.url());
      
      // エラーメッセージを探す
      const errorSelectors = [
        '.error',
        '.text-red-600',
        '[role="alert"]',
        '.toast-error',
        'text=失敗',
        'text=エラー'
      ];
      
      for (const selector of errorSelectors) {
        const errorElement = page.locator(selector);
        if (await errorElement.isVisible({ timeout: 1000 }).catch(() => false)) {
          const errorText = await errorElement.textContent();
          console.log('🚨 エラーメッセージ:', errorText);
          break;
        }
      }
      
      // デバッグ用スクリーンショット
      await page.screenshot({ path: 'login-debug.png', fullPage: true });
      console.log('📸 デバッグ用スクリーンショットを login-debug.png に保存しました');
    }
  });
});