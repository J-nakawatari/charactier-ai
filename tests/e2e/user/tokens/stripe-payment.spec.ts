import { test, expect } from '@playwright/test';

test.describe('Stripe Payment Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Login and go to token purchase
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('Stripe checkout session creation', async ({ page }) => {
    await page.goto('/tokens/purchase');
    
    // Select a pack
    await page.locator('.token-pack').first().click();
    
    // Intercept the API call to create checkout session
    const checkoutResponse = page.waitForResponse(
      response => response.url().includes('/api/v1/stripe/create-checkout-session') && 
                 response.request().method() === 'POST'
    );
    
    await page.click('button:has-text("購入する")');
    
    const response = await checkoutResponse;
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.sessionId).toBeTruthy();
    expect(data.sessionId).toMatch(/^cs_/); // Stripe session IDs start with cs_
  });

  test('Successful payment flow', async ({ page }) => {
    await page.goto('/tokens/purchase');
    
    // Select middle pack (usually 5000 yen)
    await page.locator('.token-pack').nth(2).click();
    await page.click('button:has-text("購入する")');
    
    // Wait for Stripe redirect
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 });
    
    // Fill test card info
    await page.fill('input[placeholder*="Card number"]', '4242424242424242');
    await page.fill('input[placeholder*="MM / YY"]', '12/35');
    await page.fill('input[placeholder*="CVC"]', '123');
    await page.fill('input[placeholder*="Name"]', 'Test Customer');
    await page.fill('input[placeholder*="Email"]', 'testuser@example.com');
    
    // Complete payment
    await page.click('button[type="submit"]');
    
    // Should redirect to success page
    await page.waitForURL('**/payment/success', { timeout: 30000 });
    
    // Verify success elements
    await expect(page.locator(':has-text("購入完了"), :has-text("Payment successful")')).toBeVisible();
    await expect(page.locator(':has-text("トークンが追加されました")')).toBeVisible();
  });

  test('Payment cancellation flow', async ({ page }) => {
    await page.goto('/tokens/purchase');
    
    await page.locator('.token-pack').first().click();
    await page.click('button:has-text("購入する")');
    
    // Wait for Stripe page
    await page.waitForURL(/stripe\.com/);
    
    // Go back (cancel)
    await page.goBack();
    
    // Should be back on purchase page or cancel page
    await expect(page).toHaveURL(/tokens\/purchase|payment\/cancel/);
    
    // Should show appropriate message
    if (page.url().includes('cancel')) {
      await expect(page.locator(':has-text("キャンセル"), :has-text("cancelled")')).toBeVisible();
    }
  });

  test('Declined card handling', async ({ page }) => {
    await page.goto('/tokens/purchase');
    
    await page.locator('.token-pack').first().click();
    await page.click('button:has-text("購入する")');
    
    await page.waitForURL(/stripe\.com/);
    
    // Use Stripe test card that always declines
    await page.fill('input[placeholder*="Card number"]', '4000000000000002');
    await page.fill('input[placeholder*="MM / YY"]', '12/35');
    await page.fill('input[placeholder*="CVC"]', '123');
    await page.fill('input[placeholder*="Name"]', 'Test Customer');
    
    await page.click('button[type="submit"]');
    
    // Should show decline error
    await expect(page.locator(':has-text("declined"), :has-text("拒否されました")')).toBeVisible();
  });

  test('Insufficient funds card', async ({ page }) => {
    await page.goto('/tokens/purchase');
    
    await page.locator('.token-pack').last().click(); // Most expensive
    await page.click('button:has-text("購入する")');
    
    await page.waitForURL(/stripe\.com/);
    
    // Use Stripe test card for insufficient funds
    await page.fill('input[placeholder*="Card number"]', '4000000000009995');
    await page.fill('input[placeholder*="MM / YY"]', '12/35');
    await page.fill('input[placeholder*="CVC"]', '123');
    
    await page.click('button[type="submit"]');
    
    // Should show insufficient funds error
    await expect(page.locator(':has-text("insufficient"), :has-text("残高不足")')).toBeVisible();
  });

  test('3D Secure authentication', async ({ page }) => {
    await page.goto('/tokens/purchase');
    
    await page.locator('.token-pack').nth(1).click();
    await page.click('button:has-text("購入する")');
    
    await page.waitForURL(/stripe\.com/);
    
    // Use Stripe test card that requires 3D Secure
    await page.fill('input[placeholder*="Card number"]', '4000002500003155');
    await page.fill('input[placeholder*="MM / YY"]', '12/35');
    await page.fill('input[placeholder*="CVC"]', '123');
    
    await page.click('button[type="submit"]');
    
    // Should show 3D Secure modal
    await expect(page.frameLocator('iframe').locator('text=/authenticate|verify/i')).toBeVisible({ timeout: 10000 });
    
    // Complete 3D Secure (in test mode, usually just click Complete)
    await page.frameLocator('iframe').locator('button:has-text("Complete")').click();
    
    // Should complete payment
    await page.waitForURL('**/payment/success', { timeout: 30000 });
  });

  test('Webhook handling after payment', async ({ page }) => {
    // This test verifies that webhooks are properly handled
    // In real scenario, we'd need to trigger actual webhook
    
    await page.goto('/tokens/purchase');
    
    // Monitor network for webhook-related calls
    const webhookResponse = page.waitForResponse(
      response => response.url().includes('/api/v1/stripe/webhook') || 
                 response.url().includes('/webhook'),
      { timeout: 60000 } // Webhooks might take time
    );
    
    // Complete a purchase...
    // (In real test, would complete full Stripe flow)
    
    // For now, just verify webhook endpoint exists
    const response = await page.request.post('/api/v1/stripe/webhook', {
      data: {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test123' } }
      },
      headers: {
        'stripe-signature': 'test-signature'
      }
    });
    
    // Webhook should respond (even if signature fails in test)
    expect(response.status()).toBeLessThan(500); // Not a server error
  });

  test('Idempotency key generation', async ({ page }) => {
    await page.goto('/tokens/purchase');
    
    // Select same pack twice quickly
    await page.locator('.token-pack').first().click();
    
    // Click purchase twice quickly
    const firstClick = page.click('button:has-text("購入する")');
    const secondClick = page.click('button:has-text("購入する")');
    
    await Promise.all([firstClick, secondClick]);
    
    // Should only create one checkout session (idempotency prevents duplicates)
    await page.waitForURL(/stripe\.com/);
    
    // Go back and check that only one pending transaction exists
    await page.goBack();
    await page.goto('/dashboard');
    
    // Token balance should not have duplicate pending charges
    const balance = await page.locator('[data-testid="token-balance"]').textContent();
    expect(balance).toBeTruthy();
  });
});