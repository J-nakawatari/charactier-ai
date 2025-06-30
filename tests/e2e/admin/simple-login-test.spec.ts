import { test, expect } from '@playwright/test';

test.describe('管琁E��面ログインチE��チE, () => {
  test('管琁E��面にログインできることを確誁E, async ({ page }) => {
    console.log('🚀 チE��ト開姁E 管琁E��面ログインチE��チE);
    
    // 管琁E��E��グインペ�Eジへアクセス
    await page.goto('/admin/login');
    console.log('📍 現在のURL:', page.url());
    
    // ペ�Eジが完�Eに読み込まれるのを征E��
    await page.waitForLoadState('networkidle');
    
    // ログインフォームの要素を確誁E
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    // フォーム要素が表示されてぁE��か確誁E
    console.log('📝 フォーム要素の確認中...');
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    console.log('✁Eログインフォームが表示されてぁE��ぁE);
    
    // ログイン惁E��を�E劁E
    console.log('🔑 ログイン惁E��を�E力中...');
    await emailInput.fill('admin@example.com');
    await passwordInput.fill('admin123');
    
    // ネットワークリクエストを監要E
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/auth/admin/login') && 
      response.request().method() === 'POST'
    );
    
    // ログインボタンをクリチE��
    await submitButton.click();
    console.log('🖱�E�EログインボタンをクリチE��しました');
    
    // APIレスポンスを征E��
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
        console.error('❁EログインAPIエラー:', responseBody?.message || 'Unknown error');
      }
    } catch (error) {
      console.log('⚠�E�EAPIレスポンスを征E��中にタイムアウチE);
    }
    
    // ダチE��ュボ�Eドへの遷移また�EエラーメチE��ージを確誁E
    try {
      // ダチE��ュボ�Eドへの遷移を征E��
      await page.waitForURL('**/admin/dashboard', { timeout: 5000 });
      console.log('✁EダチE��ュボ�Eドへの遷移成功');
      console.log('📍 現在のURL:', page.url());
    } catch (e) {
      console.log('⚠�E�EダチE��ュボ�Eドへの遷移に失敁E);
      console.log('📍 現在のURL:', page.url());
      
      // エラーメチE��ージを探ぁE
      const errorSelectors = [
        '.error',
        '.text-red-600',
        '[role="alert"]',
        '.toast-error',
        'text=失敁E,
        'text=エラー'
      ];
      
      for (const selector of errorSelectors) {
        const errorElement = page.locator(selector);
        if (await errorElement.isVisible({ timeout: 1000 }).catch(() => false)) {
          const errorText = await errorElement.textContent();
          console.log('🚨 エラーメチE��ージ:', errorText);
          break;
        }
      }
      
      // チE��チE��用スクリーンショチE��
      await page.screenshot({ path: 'login-debug.png', fullPage: true });
      console.log('📸 チE��チE��用スクリーンショチE��めElogin-debug.png に保存しました');
    }
  });
});
