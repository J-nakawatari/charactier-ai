import { test, expect } from '@playwright/test';

test.describe('新規会員登録（Docker環境テスト）', () => {
  test('正常な会員登録フロー', async ({ page }) => {
    // 登録ページへ移動
    await page.goto('/register');
    
    // ページが正しく読み込まれたか確認
    await page.waitForLoadState('networkidle');
    console.log('Current URL:', page.url());
    
    // デバッグ用：ページ構造をログ出力
    const formElements = await page.$$eval('form input, form button', elements => 
      elements.map(el => ({
        tag: el.tagName,
        type: el.getAttribute('type'),
        name: el.getAttribute('name'),
        placeholder: el.getAttribute('placeholder'),
        text: el.textContent
      }))
    );
    console.log('Form elements found:', JSON.stringify(formElements, null, 2));
    
    // スクリーンショット（初期状態）
    await page.screenshot({ 
      path: 'test-results/register-initial.png',
      fullPage: true 
    });
    
    // テストユーザー情報
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    // フォーム入力
    console.log('Filling email:', testEmail);
    await page.fill('input[type="email"]', testEmail);
    
    console.log('Filling password...');
    await page.fill('input[type="password"]', testPassword);
    
    // パスワード確認フィールドがあるか確認
    const confirmPasswordField = await page.$('input[name="confirmPassword"], input[placeholder*="確認"]');
    if (confirmPasswordField) {
      console.log('Confirm password field found');
      await confirmPasswordField.fill(testPassword);
    }
    
    // 入力後のスクリーンショット
    await page.screenshot({ 
      path: 'test-results/register-filled.png',
      fullPage: true 
    });
    
    // 登録ボタンを探す
    const submitButton = await page.locator('button[type="submit"], button:has-text("登録"), button:has-text("Sign up")').first();
    const buttonText = await submitButton.textContent();
    console.log('Submit button text:', buttonText);
    
    // ネットワークレスポンスを監視
    const responsePromise = page.waitForResponse(resp => 
      resp.url().includes('/api/') && resp.url().includes('register')
    );
    
    // 登録ボタンクリック
    await submitButton.click();
    
    try {
      // APIレスポンスを待つ
      const response = await responsePromise;
      console.log('API Response:', response.status(), response.url());
      
      if (response.status() !== 201 && response.status() !== 200) {
        const responseBody = await response.json();
        console.log('API Error:', responseBody);
      }
    } catch (e) {
      console.log('No API response detected');
    }
    
    // 結果を待つ
    await page.waitForTimeout(2000);
    
    // 最終スクリーンショット
    await page.screenshot({ 
      path: 'test-results/register-result.png',
      fullPage: true 
    });
    
    // 成功メッセージまたはリダイレクトを確認
    const currentUrl = page.url();
    console.log('Final URL:', currentUrl);
    
    // 成功の判定（いずれかの条件）
    const successConditions = [
      currentUrl.includes('/setup'),
      currentUrl.includes('/verify'),
      await page.locator('text=/確認メール|verification email/i').isVisible(),
      await page.locator('.toast-success, .success-message').isVisible()
    ];
    
    const isSuccess = successConditions.some(condition => condition);
    
    if (!isSuccess) {
      // エラーメッセージを探す
      const errorMessage = await page.locator('.error-message, .toast-error, [role="alert"]').textContent().catch(() => null);
      console.log('Error message found:', errorMessage);
      
      // ページのHTMLを保存
      const html = await page.content();
      require('fs').writeFileSync('test-results/register-error.html', html);
    }
    
    expect(isSuccess).toBeTruthy();
  });
  
  test('メールアドレス重複エラー', async ({ page }) => {
    await page.goto('/register');
    
    // 既存のメールアドレス（仮定）
    const existingEmail = 'existing@example.com';
    
    await page.fill('input[type="email"]', existingEmail);
    await page.fill('input[type="password"]', 'TestPassword123!');
    
    // パスワード確認
    const confirmField = await page.$('input[name="confirmPassword"], input[placeholder*="確認"]');
    if (confirmField) {
      await confirmField.fill('TestPassword123!');
    }
    
    await page.locator('button[type="submit"]').click();
    
    // エラーメッセージを待つ
    const errorMessage = await page.waitForSelector('.error-message, .toast-error, [role="alert"]', {
      timeout: 5000
    }).catch(() => null);
    
    await page.screenshot({ 
      path: 'test-results/register-duplicate-error.png',
      fullPage: true 
    });
    
    expect(errorMessage).toBeTruthy();
  });
});