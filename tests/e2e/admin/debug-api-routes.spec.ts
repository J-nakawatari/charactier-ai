import { test, expect } from '@playwright/test';

test.describe('邂｡逅・判髱｢API繝ｫ繝ｼ繝医・繝・ヰ繝・げ', () => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・API縺ｮ繝ｫ繝ｼ繝医ｒ遒ｺ隱・, async ({ page }) => {
    // 繝阪ャ繝医Ρ繝ｼ繧ｯ繝ｪ繧ｯ繧ｨ繧ｹ繝医ｒ逶｣隕・
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api')) {
        requests.push(`${request.method()} ${request.url()}`);
      }
    });

    // 繝ｬ繧ｹ繝昴Φ繧ｹ繧ら屮隕・
    page.on('response', response => {
      if (response.url().includes('/api')) {
        console.log(`Response: ${response.status()} ${response.url()}`);
      }
    });

    // 繝ｭ繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill(adminEmail);
    await page.locator('input[type="password"]').fill(adminPassword);
    await page.locator('button[type="submit"]').click();
    
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    
    // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・・繝ｼ繧ｸ縺ｸ
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    
    // 譁ｰ隕丈ｽ懈・繝壹・繧ｸ縺ｸ
    await page.goto('/admin/characters/new');
    await page.waitForLoadState('networkidle');
    
    // 譛蟆城剞縺ｮ繝・・繧ｿ繧貞・蜉・
    await page.locator('input[type="text"]').first().fill('API繝・せ繝医く繝｣繝ｩ');
    await page.locator('input[type="text"]').nth(1).fill('API Test Character');
    
    // 繝阪ャ繝医Ρ繝ｼ繧ｯ繧ｿ繝悶ｒ髢九＞縺溽憾諷九〒菫晏ｭ倥・繧ｿ繝ｳ繧偵け繝ｪ繝・け
    console.log('=== 菫晏ｭ倥・繧ｿ繝ｳ繧ｯ繝ｪ繝・け蜑阪・API蜻ｼ縺ｳ蜃ｺ縺・===');
    requests.forEach(req => console.log(req));
    requests.length = 0; // 繝ｪ繧ｻ繝・ヨ
    
    // 菫晏ｭ倥・繧ｿ繝ｳ繧偵け繝ｪ繝・け
    const saveButton = page.locator('button[type="submit"], button:has-text("菫晏ｭ・), button:has-text("菴懈・")').first();
    await saveButton.click();
    
    // 蟆代＠蠕・▽
    await page.waitForTimeout(3000);
    
    console.log('=== 菫晏ｭ倥・繧ｿ繝ｳ繧ｯ繝ｪ繝・け蠕後・API蜻ｼ縺ｳ蜃ｺ縺・===');
    requests.forEach(req => console.log(req));
    
    // 繝輔か繝ｼ繝縺ｮ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ繧堤｢ｺ隱・
    const validationErrors = await page.locator('.error, .field-error, .text-red-600').allTextContents();
    if (validationErrors.length > 0) {
      console.log('=== 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ ===');
      validationErrors.forEach(error => console.log(error));
    }
    
    // 繧ｳ繝ｳ繧ｽ繝ｼ繝ｫ繧ｨ繝ｩ繝ｼ繧堤｢ｺ隱・
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
  });

  test('譌｢蟄倥・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧAPI繧堤｢ｺ隱・, async ({ page }) => {
    // 繝ｭ繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill(adminEmail);
    await page.locator('input[type="password"]').fill(adminPassword);
    await page.locator('button[type="submit"]').click();
    
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    
    // API繝ｬ繧ｹ繝昴Φ繧ｹ繧堤屮隕・
    const apiResponse = page.waitForResponse(response => 
      response.url().includes('/api') && 
      response.url().includes('character')
    );
    
    // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・・繝ｼ繧ｸ縺ｸ
    await page.goto('/admin/characters');
    
    try {
      const response = await apiResponse;
      console.log('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧAPI:', response.url());
      console.log('繧ｹ繝・・繧ｿ繧ｹ:', response.status());
      
      if (response.ok()) {
        const data = await response.json();
        console.log('繝ｬ繧ｹ繝昴Φ繧ｹ繝・・繧ｿ:', JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.log('API繝ｬ繧ｹ繝昴Φ繧ｹ繧貞ｾ・ｩ滉ｸｭ縺ｫ繧ｿ繧､繝繧｢繧ｦ繝・);
    }
  });
});
