import { test, expect } from '@playwright/test';

test.describe('管理画面APIルートのデバッグ', () => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('キャラクター作成APIのルートを確認', async ({ page }) => {
    // ネットワークリクエストを監視
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api')) {
        requests.push(`${request.method()} ${request.url()}`);
      }
    });

    // レスポンスも監視
    page.on('response', response => {
      if (response.url().includes('/api')) {
        console.log(`Response: ${response.status()} ${response.url()}`);
      }
    });

    // ログイン
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill(adminEmail);
    await page.locator('input[type="password"]').fill(adminPassword);
    await page.locator('button[type="submit"]').click();
    
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    
    // キャラクター管理ページへ
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    
    // 新規作成ページへ
    await page.goto('/admin/characters/new');
    await page.waitForLoadState('networkidle');
    
    // 最小限のデータを入力
    await page.locator('input[type="text"]').first().fill('APIテストキャラ');
    await page.locator('input[type="text"]').nth(1).fill('API Test Character');
    
    // ネットワークタブを開いた状態で保存ボタンをクリック
    console.log('=== 保存ボタンクリック前のAPI呼び出し ===');
    requests.forEach(req => console.log(req));
    requests.length = 0; // リセット
    
    // 保存ボタンをクリック
    const saveButton = page.locator('button[type="submit"], button:has-text("保存"), button:has-text("作成")').first();
    await saveButton.click();
    
    // 少し待つ
    await page.waitForTimeout(3000);
    
    console.log('=== 保存ボタンクリック後のAPI呼び出し ===');
    requests.forEach(req => console.log(req));
    
    // フォームのバリデーションエラーを確認
    const validationErrors = await page.locator('.error, .field-error, .text-red-600').allTextContents();
    if (validationErrors.length > 0) {
      console.log('=== バリデーションエラー ===');
      validationErrors.forEach(error => console.log(error));
    }
    
    // コンソールエラーを確認
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
  });

  test('既存のキャラクター一覧APIを確認', async ({ page }) => {
    // ログイン
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill(adminEmail);
    await page.locator('input[type="password"]').fill(adminPassword);
    await page.locator('button[type="submit"]').click();
    
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    
    // APIレスポンスを監視
    const apiResponse = page.waitForResponse(response => 
      response.url().includes('/api') && 
      response.url().includes('character')
    );
    
    // キャラクター管理ページへ
    await page.goto('/admin/characters');
    
    try {
      const response = await apiResponse;
      console.log('キャラクター一覧API:', response.url());
      console.log('ステータス:', response.status());
      
      if (response.ok()) {
        const data = await response.json();
        console.log('レスポンスデータ:', JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.log('APIレスポンスを待機中にタイムアウト');
    }
  });
});