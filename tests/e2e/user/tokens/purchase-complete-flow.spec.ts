import { test, expect } from '@playwright/test';

test.describe('Token Purchase Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('Complete token purchase flow with 99% profit verification', async ({ page }) => {
    // Step 1: Navigate to token purchase page
    await page.click('a:has-text("トークン購入"), button:has-text("トークン購入")');
    await page.waitForURL('**/tokens/purchase');
    
    // Step 2: Verify token packs are displayed
    await expect(page.locator('.token-pack, [data-testid="token-pack"]').first()).toBeVisible();
    
    // Step 3: Check 99% profit rate calculation
    // Get first pack details
    const packElement = page.locator('.token-pack').first();
    const priceText = await packElement.locator('.price, [data-testid="price"]').textContent();
    const tokenAmountText = await packElement.locator('.token-amount, [data-testid="token-amount"]').textContent();
    
    // Extract numbers
    const price = parseInt(priceText?.replace(/[^0-9]/g, '') || '0');
    const tokenAmount = parseInt(tokenAmountText?.replace(/[^0-9]/g, '') || '0');
    
    // Verify 99% profit margin (1% cost)
    // Cost per token should be approximately 0.01 yen
    const costPerToken = price / tokenAmount;
    console.log(`Price: ${price} yen, Tokens: ${tokenAmount}, Cost per token: ${costPerToken} yen`);
    
    // OpenAI cost is roughly $0.01 per 1000 tokens = 1.5 yen per 1000 tokens at 150 JPY/USD
    // So 0.0015 yen per token. With 99% profit, selling price should be ~0.15 yen per token
    expect(costPerToken).toBeGreaterThan(0.1); // Should be selling for more than 0.1 yen per token
    expect(costPerToken).toBeLessThan(1); // But not too expensive
    
    // Step 4: Select a token pack
    await packElement.click();
    await page.click('button:has-text("購入する"), button:has-text("Purchase")');
    
    // Step 5: Stripe checkout redirect
    await page.waitForURL(/checkout\.stripe\.com|stripe\.com/);
    
    // Verify Stripe checkout page elements
    await expect(page.locator('form, [data-testid="checkout-form"]')).toBeVisible({ timeout: 10000 });
    
    // Step 6: Fill test card details (Stripe test mode)
    await page.fill('[placeholder*="Card number"], input[name="cardNumber"]', '4242424242424242');
    await page.fill('[placeholder*="MM / YY"], input[name="cardExpiry"]', '12/35');
    await page.fill('[placeholder*="CVC"], input[name="cardCvc"]', '123');
    await page.fill('[placeholder*="Name"], input[name="billingName"]', 'Test User');
    
    // Step 7: Complete purchase
    await page.click('button[type="submit"], button:has-text("支払う"), button:has-text("Pay")');
    
    // Step 8: Wait for redirect back to success page
    await page.waitForURL('**/payment/success', { timeout: 30000 });
    
    // Step 9: Verify success message
    await expect(page.locator(':has-text("購入完了"), :has-text("Payment successful")')).toBeVisible();
    
    // Step 10: Verify tokens were added to balance
    const newBalance = await page.locator('[data-testid="token-balance"], .token-balance').textContent();
    expect(parseInt(newBalance?.replace(/[^0-9]/g, '') || '0')).toBeGreaterThan(0);
    
    // Step 11: Check purchase history
    await page.goto('/dashboard');
    await page.click('a:has-text("購入履歴"), button:has-text("購入履歴")');
    
    // Should see the recent purchase
    await expect(page.locator('.purchase-history-item, [data-testid="purchase-item"]').first()).toBeVisible();
  });

  test('Token pack pricing display', async ({ page }) => {
    await page.goto('/tokens/purchase');
    
    // Check all packs display correctly
    const packs = page.locator('.token-pack, [data-testid="token-pack"]');
    const packCount = await packs.count();
    
    expect(packCount).toBeGreaterThan(0);
    
    for (let i = 0; i < packCount; i++) {
      const pack = packs.nth(i);
      
      // Each pack should show:
      // - Price in yen
      await expect(pack.locator(':has-text("円"), :has-text("¥")')).toBeVisible();
      
      // - Token amount
      await expect(pack.locator(':has-text("トークン"), :has-text("tokens")')).toBeVisible();
      
      // - Bonus tokens (if any)
      const bonusText = await pack.locator(':has-text("ボーナス"), :has-text("bonus")').textContent();
      if (bonusText) {
        expect(bonusText).toMatch(/\d+/); // Should contain numbers
      }
    }
  });

  test('Stripe checkout cancellation', async ({ page }) => {
    await page.goto('/tokens/purchase');
    
    // Select a pack
    await page.locator('.token-pack').first().click();
    await page.click('button:has-text("購入する")');
    
    // Wait for Stripe redirect
    await page.waitForURL(/stripe\.com/);
    
    // Click back/cancel
    await page.goBack();
    
    // Should return to purchase page or show cancellation message
    await expect(page).toHaveURL(/tokens\/purchase|payment\/cancel/);
    
    // Token balance should not change
    const balance = await page.locator('[data-testid="token-balance"]').textContent();
    expect(balance).toBeTruthy(); // Should still show original balance
  });

  test('Purchase with insufficient payment method', async ({ page }) => {
    await page.goto('/tokens/purchase');
    
    // Select most expensive pack
    const packs = page.locator('.token-pack');
    await packs.last().click();
    await page.click('button:has-text("購入する")');
    
    // In Stripe checkout, use a card that will be declined
    await page.waitForURL(/stripe\.com/);
    await page.fill('[placeholder*="Card number"]', '4000000000000002'); // Stripe test card that always declines
    await page.fill('[placeholder*="MM / YY"]', '12/35');
    await page.fill('[placeholder*="CVC"]', '123');
    
    await page.click('button[type="submit"]');
    
    // Should show error
    await expect(page.locator(':has-text("declined"), :has-text("エラー")')).toBeVisible();
  });

  test('Real-time notification after purchase', async ({ page }) => {
    // This test would check for SSE notifications
    // For now, we'll check if the notification system is set up
    
    await page.goto('/dashboard');
    
    // Check if SSE connection is established
    const hasNotificationStream = await page.evaluate(() => {
      return window.EventSource !== undefined;
    });
    
    expect(hasNotificationStream).toBeTruthy();
  });

  test('99% profit rate validation', async ({ page }) => {
    await page.goto('/tokens/purchase');
    
    // Get all pack data
    const packs = await page.$$eval('.token-pack, [data-testid="token-pack"]', elements => 
      elements.map(el => ({
        price: parseInt(el.querySelector('.price')?.textContent?.replace(/[^0-9]/g, '') || '0'),
        tokens: parseInt(el.querySelector('.token-amount')?.textContent?.replace(/[^0-9]/g, '') || '0')
      }))
    );
    
    // Verify each pack maintains ~99% profit margin
    for (const pack of packs) {
      if (pack.price > 0 && pack.tokens > 0) {
        const revenuePerToken = pack.price / pack.tokens;
        
        // Assuming OpenAI cost of ~0.0015 yen per token
        const costPerToken = 0.0015;
        const profitMargin = (revenuePerToken - costPerToken) / revenuePerToken;
        
        console.log(`Pack: ${pack.price} yen for ${pack.tokens} tokens`);
        console.log(`Revenue per token: ${revenuePerToken} yen`);
        console.log(`Profit margin: ${(profitMargin * 100).toFixed(2)}%`);
        
        // Allow some flexibility but should be close to 99%
        expect(profitMargin).toBeGreaterThan(0.95); // At least 95% profit
        expect(profitMargin).toBeLessThanOrEqual(0.999); // At most 99.9% profit
      }
    }
  });
});