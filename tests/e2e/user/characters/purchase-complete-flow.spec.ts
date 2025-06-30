import { test, expect } from '@playwright/test';

test.describe('Character Purchase Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user with tokens
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('Complete character purchase flow', async ({ page }) => {
    // Step 1: Navigate to character list
    await page.click('a:has-text("キャラクター"), a:has-text("Characters")');
    await page.waitForURL('**/characters');
    
    // Step 2: Verify free and paid characters are displayed
    await expect(page.locator('.character-card, [data-testid="character-card"]').first()).toBeVisible();
    
    // Find a paid character (not purchased)
    const paidCharacter = page.locator('.character-card:has(.price):not(:has(.purchased))').first();
    await expect(paidCharacter).toBeVisible();
    
    // Step 3: Check character details
    const characterName = await paidCharacter.locator('.character-name, [data-testid="character-name"]').textContent();
    const characterPrice = await paidCharacter.locator('.price, [data-testid="price"]').textContent();
    
    console.log(`Purchasing character: ${characterName} for ${characterPrice}`);
    
    // Step 4: Click on the character to view details
    await paidCharacter.click();
    await page.waitForURL(/characters\/[a-zA-Z0-9]+/);
    
    // Step 5: Verify character detail page
    await expect(page.locator('h1, .character-title')).toContainText(characterName || '');
    await expect(page.locator('.character-description, [data-testid="description"]')).toBeVisible();
    
    // Should show purchase button for unpurchased character
    const purchaseButton = page.locator('button:has-text("購入"), button:has-text("Purchase")');
    await expect(purchaseButton).toBeVisible();
    await expect(purchaseButton).toContainText(characterPrice || '');
    
    // Step 6: Click purchase button
    await purchaseButton.click();
    
    // Step 7: Should redirect to Stripe checkout
    await page.waitForURL(/checkout\.stripe\.com|stripe\.com/, { timeout: 15000 });
    
    // Step 8: Fill payment details
    await page.fill('input[placeholder*="Card number"]', '4242424242424242');
    await page.fill('input[placeholder*="MM / YY"]', '12/35');
    await page.fill('input[placeholder*="CVC"]', '123');
    await page.fill('input[placeholder*="Name"]', 'Test Customer');
    
    // Step 9: Complete purchase
    await page.click('button[type="submit"]');
    
    // Step 10: Wait for success redirect
    await page.waitForURL('**/payment/success', { timeout: 30000 });
    
    // Step 11: Verify purchase success
    await expect(page.locator(':has-text("購入完了"), :has-text("Purchase complete")')).toBeVisible();
    await expect(page.locator(`:has-text("${characterName}")`)).toBeVisible();
    
    // Step 12: Navigate back to character page
    await page.click('a:has-text("キャラクターを見る"), a:has-text("View character")');
    
    // Step 13: Verify character is now unlocked
    await expect(page.locator('button:has-text("チャットを開始"), button:has-text("Start chat")')).toBeVisible();
    await expect(page.locator('button:has-text("購入")')).not.toBeVisible(); // Purchase button should be gone
    
    // Step 14: Start chat to confirm access
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Should see chat interface with the character
    await expect(page.locator('.chat-interface, [data-testid="chat-interface"]')).toBeVisible();
    await expect(page.locator(`:has-text("${characterName}")`)).toBeVisible();
  });

  test('Character purchase state persistence', async ({ page }) => {
    // Purchase a character first
    await page.goto('/characters');
    
    // Find and purchase a character
    const unpurchasedChar = page.locator('.character-card:has(.price):not(:has(.purchased))').first();
    const charName = await unpurchasedChar.locator('.character-name').textContent();
    
    await unpurchasedChar.click();
    await page.click('button:has-text("購入")');
    
    // Complete purchase in Stripe
    await page.waitForURL(/stripe\.com/);
    await page.fill('input[placeholder*="Card number"]', '4242424242424242');
    await page.fill('input[placeholder*="MM / YY"]', '12/35');
    await page.fill('input[placeholder*="CVC"]', '123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/payment/success');
    
    // Now logout and login again
    await page.click('button:has-text("ログアウト"), a:has-text("Logout")');
    await page.waitForURL('**/');
    
    // Login again
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Go to characters
    await page.goto('/characters');
    
    // Find the same character - should now show as purchased
    const purchasedChar = page.locator(`.character-card:has-text("${charName}")`);
    await expect(purchasedChar.locator('.purchased-badge, :has-text("購入済み"), :has-text("Purchased")')).toBeVisible();
  });

  test('Free character access without purchase', async ({ page }) => {
    await page.goto('/characters');
    
    // Find a free character
    const freeCharacter = page.locator('.character-card:has(.free-badge), .character-card:has-text("無料"), .character-card:not(:has(.price))').first();
    await expect(freeCharacter).toBeVisible();
    
    const charName = await freeCharacter.locator('.character-name').textContent();
    
    // Click on free character
    await freeCharacter.click();
    
    // Should not show purchase button
    await expect(page.locator('button:has-text("購入")')).not.toBeVisible();
    
    // Should show chat start button directly
    await expect(page.locator('button:has-text("チャットを開始"), button:has-text("Start chat")')).toBeVisible();
    
    // Can start chat immediately
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Verify chat started
    await expect(page.locator('.chat-interface')).toBeVisible();
    await expect(page.locator(`:has-text("${charName}")`)).toBeVisible();
  });

  test('Character filter by purchase status', async ({ page }) => {
    await page.goto('/characters');
    
    // Test filter options
    const filterDropdown = page.locator('select[name="filter"], [data-testid="filter-dropdown"]');
    
    // Filter: All characters
    await filterDropdown.selectOption('all');
    await page.waitForTimeout(500);
    let characterCount = await page.locator('.character-card').count();
    expect(characterCount).toBeGreaterThan(0);
    
    // Filter: Free characters only
    await filterDropdown.selectOption('free');
    await page.waitForTimeout(500);
    const freeCount = await page.locator('.character-card').count();
    expect(freeCount).toBeGreaterThan(0);
    expect(freeCount).toBeLessThanOrEqual(characterCount);
    
    // All displayed should be free
    const freeCards = await page.locator('.character-card').all();
    for (const card of freeCards) {
      await expect(card.locator('.price')).not.toBeVisible();
    }
    
    // Filter: Purchased characters only
    await filterDropdown.selectOption('purchased');
    await page.waitForTimeout(500);
    const purchasedCards = await page.locator('.character-card').all();
    for (const card of purchasedCards) {
      await expect(card.locator('.purchased-badge, :has-text("購入済み")')).toBeVisible();
    }
    
    // Filter: Unpurchased characters only
    await filterDropdown.selectOption('unpurchased');
    await page.waitForTimeout(500);
    const unpurchasedCards = await page.locator('.character-card').all();
    for (const card of unpurchasedCards) {
      await expect(card.locator('.price')).toBeVisible();
      await expect(card.locator('.purchased-badge')).not.toBeVisible();
    }
  });

  test('Purchase cancellation handling', async ({ page }) => {
    await page.goto('/characters');
    
    // Select unpurchased character
    const unpurchased = page.locator('.character-card:has(.price):not(:has(.purchased))').first();
    await unpurchased.click();
    
    // Click purchase
    await page.click('button:has-text("購入")');
    
    // Wait for Stripe
    await page.waitForURL(/stripe\.com/);
    
    // Cancel by going back
    await page.goBack();
    
    // Should be back on character page or cancel page
    await expect(page).toHaveURL(/characters|payment\/cancel/);
    
    // Character should still be unpurchased
    if (page.url().includes('characters')) {
      await expect(page.locator('button:has-text("購入")')).toBeVisible();
    }
  });

  test('Insufficient funds for character purchase', async ({ page }) => {
    await page.goto('/characters');
    
    // Find most expensive character
    const expensiveChar = page.locator('.character-card:has(.price)').last();
    await expensiveChar.click();
    
    await page.click('button:has-text("購入")');
    await page.waitForURL(/stripe\.com/);
    
    // Use insufficient funds test card
    await page.fill('input[placeholder*="Card number"]', '4000000000009995');
    await page.fill('input[placeholder*="MM / YY"]', '12/35');
    await page.fill('input[placeholder*="CVC"]', '123');
    
    await page.click('button[type="submit"]');
    
    // Should show error
    await expect(page.locator(':has-text("insufficient"), :has-text("残高不足")')).toBeVisible();
  });
});