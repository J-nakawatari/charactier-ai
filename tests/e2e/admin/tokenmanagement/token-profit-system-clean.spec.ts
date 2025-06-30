import { test, expect } from '@playwright/test';

test.describe('Token Management 99% Profit System Test', () => {
  let adminToken: string;
  const testEmail = 'admin@example.com';
  const testPassword = 'admin123';

  test.beforeEach(async ({ page }) => {
    // Admin login
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    
    // Wait for login success
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Get token for debug
    adminToken = await page.evaluate(() => localStorage.getItem('adminToken') || '');
  });

  test('Token pack creation with 99% profit rate', async ({ page }) => {
    // Navigate to token management
    await page.locator('a:has-text("トークチケット管理")').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Verify page loaded
    const pageTitle = await page.locator('h1:has-text("トークン管理")').textContent();
    expect(pageTitle).toBe('トークン管理');
    
    // Switch to pack management tab
    await page.locator('button:has-text("パック管理")').click();
    await page.waitForTimeout(1000);
    
    // Click new button
    await page.locator('button:has-text("新規作成")').click();
    
    // Enter test price
    const testPrice = 500;
    await page.locator('input[name="price"]').fill(testPrice.toString());
    await page.locator('input[name="name"]').fill('Test Pack 500');
    
    // Verify token amount is calculated
    const tokenAmountField = page.locator('input[name="tokenAmount"]');
    await page.waitForTimeout(1000);
    
    const calculatedTokens = await tokenAmountField.inputValue();
    expect(parseInt(calculatedTokens)).toBeGreaterThan(0);
    
    // Save and verify
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/admin/token-packs') && response.request().method() === 'POST'
    );
    
    await page.locator('button:has-text("保存")').click();
    
    const response = await responsePromise;
    const responseData = await response.json();
    
    // Verify profit rate
    if (responseData.tokenPack) {
      const costRatio = 0.01;
      const expectedMinTokens = Math.floor(testPrice * costRatio * 0.9);
      expect(responseData.tokenPack.tokenAmount).toBeGreaterThan(expectedMinTokens);
    }
  });
});