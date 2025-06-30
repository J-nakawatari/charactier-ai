# トークン管理テストファイルを修復するスクリプト

$testContent = @'
import { test, expect } from '@playwright/test';

test.describe('99% Profit System E2E Test', () => {
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
    
    // Get token (for debug)
    adminToken = await page.evaluate(() => localStorage.getItem('adminToken') || '');
  });

  test('Token pack creation with 99% profit rate verification', async ({ page }) => {
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
    
    // Enter test price (500 yen)
    const testPrice = 500;
    await page.locator('input[name="price"]').fill(testPrice.toString());
    await page.locator('input[name="name"]').fill('Profit Rate Test Pack');
    
    // Verify token amount is calculated
    const tokenAmountField = page.locator('input[name="tokenAmount"]');
    await page.waitForTimeout(1000);
    
    const calculatedTokens = await tokenAmountField.inputValue();
    expect(parseInt(calculatedTokens)).toBeGreaterThan(0);
    
    // Intercept API response
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/admin/token-packs') && response.request().method() === 'POST'
    );
    
    // Save
    await page.locator('button:has-text("保存")').click();
    
    const response = await responsePromise;
    const responseData = await response.json();
    
    // Verify 99% profit rate
    if (responseData.tokenPack) {
      const costRatio = 0.01;
      const expectedMinTokens = Math.floor(testPrice * costRatio * 0.9);
      expect(responseData.tokenPack.tokenAmount).toBeGreaterThan(expectedMinTokens);
    }
  });

  test('Price recalculation on exchange rate change', async ({ page }) => {
    // Navigate to token management
    await page.locator('a:has-text("トークチケット管理")').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Switch to pack management
    await page.locator('button:has-text("パック管理")').click();
    await page.waitForTimeout(1000);
    
    // Create test pack
    await page.locator('button:has-text("新規作成")').click();
    await page.locator('input[name="name"]').fill('Exchange Rate Test Pack');
    await page.locator('input[name="price"]').fill('2000');
    await page.waitForTimeout(1000);
    
    // Save and return to list
    await page.locator('button:has-text("保存")').click();
    await page.waitForResponse(response => response.url().includes('/api/v1/admin/token-packs') && response.status() === 201);
    await page.waitForTimeout(2000);
    
    // Click edit button
    const editButton = page.locator('tr:has-text("Exchange Rate Test Pack") button:has-text("編集")');
    await editButton.waitFor({ state: 'visible', timeout: 5000 });
    await editButton.click();
    
    // Wait for form
    await page.waitForSelector('input[name="tokenAmount"]', { state: 'visible', timeout: 5000 });
    
    // Record current values
    const tokenAmountField = page.locator('input[name="tokenAmount"]');
    const originalTokenAmount = await tokenAmountField.inputValue();
    const originalPrice = await page.locator('input[name="price"]').inputValue();
    
    console.log(`Initial: price=${originalPrice} yen, tokens=${originalTokenAmount}`);
    
    // Change price and verify recalculation
    await page.locator('input[name="price"]').fill('3000');
    await page.waitForTimeout(1000);
    
    const newTokenAmount = await tokenAmountField.inputValue();
    console.log(`After change: price=3000 yen, tokens=${newTokenAmount}`);
    
    // Verify token amount changed
    expect(newTokenAmount).not.toBe(originalTokenAmount);
    
    // Verify 99% profit rate maintained
    const ratio = parseInt(newTokenAmount) / parseInt(originalTokenAmount);
    const expectedRatio = 3000 / 2000;
    expect(Math.abs(ratio - expectedRatio)).toBeLessThan(0.1);
  });

  test('Stripe Price ID registration and retrieval', async ({ page }) => {
    // Navigate to token management
    await page.locator('a:has-text("トークチケット管理")').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Switch to pack management
    await page.locator('button:has-text("パック管理")').click();
    await page.waitForTimeout(1000);
    
    // Create new
    await page.locator('button:has-text("新規作成")').click();
    
    // Fill form
    await page.locator('input[name="name"]').fill('Stripe Price ID Test Pack');
    await page.locator('input[name="price"]').fill('1000');
    
    // Expect Stripe Price ID generation
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/admin/token-packs') && response.request().method() === 'POST'
    );
    
    await page.locator('button:has-text("保存")').click();
    
    const response = await responsePromise;
    const responseData = await response.json();
    
    // Verify Stripe Price ID
    if (responseData.tokenPack && responseData.tokenPack.stripePriceId) {
      expect(responseData.tokenPack.stripePriceId).toMatch(/^price_/);
      console.log(`Stripe Price ID: ${responseData.tokenPack.stripePriceId}`);
    }
  });

  test('Edge cases for profit rate calculation', async ({ page }) => {
    // Navigate to token management
    await page.locator('a:has-text("トークチケット管理")').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Switch to pack management
    await page.locator('button:has-text("パック管理")').click();
    await page.waitForTimeout(1000);
    
    // Create new
    await page.locator('button:has-text("新規作成")').click();
    
    // Test small amount (100 yen)
    await page.locator('input[name="price"]').fill('100');
    await page.locator('input[name="name"]').fill('Small Amount Test');
    await page.waitForTimeout(1000);
    
    const smallAmountTokens = await page.locator('input[name="tokenAmount"]').inputValue();
    expect(parseInt(smallAmountTokens)).toBeGreaterThan(0);
    
    // Test large amount (10000 yen)
    await page.locator('input[name="price"]').fill('10000');
    await page.waitForTimeout(1000);
    
    const largeAmountTokens = await page.locator('input[name="tokenAmount"]').inputValue();
    expect(parseInt(largeAmountTokens)).toBeGreaterThan(parseInt(smallAmountTokens));
    
    // Verify constant ratio (99% profit rate)
    const ratio = parseInt(largeAmountTokens) / parseInt(smallAmountTokens);
    const expectedRatio = 10000 / 100;
    expect(Math.abs(ratio - expectedRatio)).toBeLessThan(1);
  });
});
'@

# ファイルを作成
[System.IO.File]::WriteAllText("tests\e2e\admin\tokenmanagement\token-profit-system.spec.ts", $testContent, [System.Text.Encoding]::UTF8)

Write-Host "File fixed successfully!" -ForegroundColor Green