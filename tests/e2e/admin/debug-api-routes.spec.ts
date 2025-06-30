import { test, expect } from '@playwright/test';

test.describe('管琁E��面APIルート�EチE��チE��', () => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('キャラクター作�EAPIのルートを確誁E, async ({ page }) => {
    // ネットワークリクエストを監要E
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api')) {
        requests.push(`${request.method()} ${request.url()}`);
      }
    });

    // レスポンスも監要E
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
    
    // キャラクター管琁E�Eージへ
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    
    // 新規作�Eペ�Eジへ
    await page.goto('/admin/characters/new');
    await page.waitForLoadState('networkidle');
    
    // 最小限のチE�Eタを�E劁E
    await page.locator('input[type="text"]').first().fill('APIチE��トキャラ');
    await page.locator('input[type="text"]').nth(1).fill('API Test Character');
    
    // ネットワークタブを開いた状態で保存�EタンをクリチE��
    console.log('=== 保存�EタンクリチE��前�EAPI呼び出ぁE===');
    requests.forEach(req => console.log(req));
    requests.length = 0; // リセチE��
    
    // 保存�EタンをクリチE��
    const saveButton = page.locator('button[type="submit"], button:has-text("保孁E), button:has-text("作�E")').first();
    await saveButton.click();
    
    // 少し征E��
    await page.waitForTimeout(3000);
    
    console.log('=== 保存�EタンクリチE��後�EAPI呼び出ぁE===');
    requests.forEach(req => console.log(req));
    
    // フォームのバリチE�Eションエラーを確誁E
    const validationErrors = await page.locator('.error, .field-error, .text-red-600').allTextContents();
    if (validationErrors.length > 0) {
      console.log('=== バリチE�Eションエラー ===');
      validationErrors.forEach(error => console.log(error));
    }
    
    // コンソールエラーを確誁E
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
  });

  test('既存�Eキャラクター一覧APIを確誁E, async ({ page }) => {
    // ログイン
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill(adminEmail);
    await page.locator('input[type="password"]').fill(adminPassword);
    await page.locator('button[type="submit"]').click();
    
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    
    // APIレスポンスを監要E
    const apiResponse = page.waitForResponse(response => 
      response.url().includes('/api') && 
      response.url().includes('character')
    );
    
    // キャラクター管琁E�Eージへ
    await page.goto('/admin/characters');
    
    try {
      const response = await apiResponse;
      console.log('キャラクター一覧API:', response.url());
      console.log('スチE�Eタス:', response.status());
      
      if (response.ok()) {
        const data = await response.json();
        console.log('レスポンスチE�Eタ:', JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.log('APIレスポンスを征E��中にタイムアウチE);
    }
  });
});
