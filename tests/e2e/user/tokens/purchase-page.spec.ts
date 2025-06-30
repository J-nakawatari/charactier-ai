import { test, expect } from '@playwright/test';

test.describe('Token Purchase Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to token purchase page
    await page.goto('/tokens/purchase');
  });

  test('Token pack list display', async ({ page }) => {
    // Should show multiple token packs
    const packs = page.locator('.token-pack, [data-testid="token-pack"]');
    await expect(packs).toHaveCount(5); // Assuming 5 different packs
    
    // Each pack should display:
    // 1. Name
    // 2. Price in JPY
    // 3. Token amount
    // 4. Bonus amount (if applicable)
    // 5. Purchase button
    
    const firstPack = packs.first();
    await expect(firstPack.locator('.pack-name, [data-testid="pack-name"]')).toBeVisible();
    await expect(firstPack.locator('.price, [data-testid="price"]')).toContainText('円');
    await expect(firstPack.locator('.token-amount, [data-testid="token-amount"]')).toContainText('トークン');
    await expect(firstPack.locator('button:has-text("購入"), button:has-text("Buy")')).toBeVisible();
  });

  test('Bonus token display for larger packs', async ({ page }) => {
    const packs = page.locator('.token-pack');
    const packCount = await packs.count();
    
    // Larger packs (last ones) should show bonus
    const lastPack = packs.nth(packCount - 1);
    await expect(lastPack.locator('.bonus, [data-testid="bonus"], :has-text("ボーナス")')).toBeVisible();
    
    // Bonus percentage should be displayed
    const bonusText = await lastPack.locator('.bonus').textContent();
    expect(bonusText).toMatch(/\d+%|\+\d+/); // Should show percentage or +tokens
  });

  test('Current token balance display', async ({ page }) => {
    // Should show current balance prominently
    await expect(page.locator('.current-balance, [data-testid="current-balance"], :has-text("現在の残高")')).toBeVisible();
    
    // Balance should be a number
    const balanceText = await page.locator('[data-testid="token-balance"], .token-balance').textContent();
    expect(balanceText).toMatch(/\d+/);
  });

  test('Pack selection and checkout', async ({ page }) => {
    // Click on a pack
    const secondPack = page.locator('.token-pack').nth(1);
    await secondPack.click();
    
    // Pack should be highlighted/selected
    await expect(secondPack).toHaveClass(/selected|active/);
    
    // Click purchase button
    await secondPack.locator('button:has-text("購入")').click();
    
    // Should redirect to Stripe
    await page.waitForURL(/stripe\.com|checkout/, { timeout: 10000 });
  });

  test('Price formatting and currency', async ({ page }) => {
    const prices = await page.locator('.price, [data-testid="price"]').allTextContents();
    
    for (const price of prices) {
      // Should be formatted with yen symbol or 円
      expect(price).toMatch(/¥|円/);
      
      // Should have proper number formatting (e.g., 1,000)
      if (price.includes('1000') || price.includes('5000')) {
        expect(price).toMatch(/,/);
      }
    }
  });

  test('Mobile responsive layout', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Packs should stack vertically
    const packs = page.locator('.token-pack');
    const firstPackBox = await packs.first().boundingBox();
    const secondPackBox = await packs.nth(1).boundingBox();
    
    // Second pack should be below first pack (not side by side)
    expect(secondPackBox?.y).toBeGreaterThan(firstPackBox?.y || 0);
  });

  test('Pack recommendation highlight', async ({ page }) => {
    // Usually middle packs are marked as "popular" or "recommended"
    const recommendedPack = page.locator('.token-pack:has-text("おすすめ"), .token-pack:has-text("人気"), .token-pack.recommended');
    
    if (await recommendedPack.count() > 0) {
      // Should have special styling
      await expect(recommendedPack).toHaveClass(/recommended|popular|highlight/);
      
      // Should have a badge or label
      await expect(recommendedPack.locator('.badge, .label, :has-text("おすすめ")')).toBeVisible();
    }
  });

  test('Purchase history link', async ({ page }) => {
    // Should have link to view purchase history
    await expect(page.locator('a:has-text("購入履歴"), a:has-text("Purchase History")')).toBeVisible();
    
    // Click it
    await page.click('a:has-text("購入履歴")');
    await expect(page).toHaveURL(/history|purchases/);
  });

  test('Payment method information', async ({ page }) => {
    // Should show accepted payment methods
    await expect(page.locator(':has-text("クレジットカード"), :has-text("Credit Card"), img[alt*="card"]')).toBeVisible();
    
    // Should mention Stripe for security
    await expect(page.locator(':has-text("Stripe"), :has-text("安全な決済")')).toBeVisible();
  });

  test('Terms and conditions link', async ({ page }) => {
    // Should have link to terms
    await expect(page.locator('a:has-text("利用規約"), a:has-text("Terms")')).toBeVisible();
    
    // Should have link to special commerce law
    await expect(page.locator('a:has-text("特定商取引法"), a:has-text("特商法")')).toBeVisible();
  });
});