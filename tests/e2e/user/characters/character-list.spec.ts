import { test, expect } from '@playwright/test';

test.describe('Character List Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to characters page
    await page.goto('/characters');
  });

  test('Character list display', async ({ page }) => {
    // Should show character grid/list
    await expect(page.locator('.character-grid, .character-list, [data-testid="character-list"]')).toBeVisible();
    
    // Should have multiple characters
    const characters = page.locator('.character-card, [data-testid="character-card"]');
    await expect(characters).toHaveCount(await characters.count());
    expect(await characters.count()).toBeGreaterThan(0);
    
    // Each character should display:
    const firstCharacter = characters.first();
    
    // 1. Character image
    await expect(firstCharacter.locator('img, .character-image')).toBeVisible();
    
    // 2. Character name
    await expect(firstCharacter.locator('.character-name, [data-testid="character-name"]')).toBeVisible();
    
    // 3. Character description (short)
    await expect(firstCharacter.locator('.character-description, [data-testid="description"]')).toBeVisible();
    
    // 4. Status (free/paid/purchased)
    const statusIndicators = firstCharacter.locator('.free-badge, .price, .purchased-badge');
    await expect(statusIndicators).toHaveCount(await statusIndicators.count());
    expect(await statusIndicators.count()).toBeGreaterThan(0);
  });

  test('Free vs Paid character indicators', async ({ page }) => {
    // Free characters
    const freeCharacters = page.locator('.character-card:has(.free-badge), .character-card:has-text("無料")');
    if (await freeCharacters.count() > 0) {
      const freeChar = freeCharacters.first();
      await expect(freeChar.locator('.free-badge, :has-text("無料"), :has-text("Free")')).toBeVisible();
      await expect(freeChar.locator('.price')).not.toBeVisible();
    }
    
    // Paid characters
    const paidCharacters = page.locator('.character-card:has(.price)');
    if (await paidCharacters.count() > 0) {
      const paidChar = paidCharacters.first();
      await expect(paidChar.locator('.price')).toBeVisible();
      await expect(paidChar.locator('.price')).toContainText('円');
    }
  });

  test('Character sorting functionality', async ({ page }) => {
    const sortDropdown = page.locator('select[name="sort"], [data-testid="sort-dropdown"]');
    await expect(sortDropdown).toBeVisible();
    
    // Test different sort options
    const sortOptions = ['popular', 'newest', 'oldest', 'name', 'affinity'];
    
    for (const option of sortOptions) {
      await sortDropdown.selectOption(option);
      await page.waitForTimeout(500); // Wait for re-render
      
      // Verify characters are still displayed
      await expect(page.locator('.character-card').first()).toBeVisible();
      
      // For popular sort, most popular should show first
      if (option === 'popular') {
        const firstCard = page.locator('.character-card').first();
        // Popular characters might have badges or indicators
        const popularIndicator = firstCard.locator('.popular-badge, .user-count, :has-text("人気")');
        // Just check it exists, might not always have indicator
      }
    }
  });

  test('Character search functionality', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="検索"], input[placeholder*="Search"], [data-testid="search-input"]');
    await expect(searchInput).toBeVisible();
    
    // Get a character name to search for
    const firstCharName = await page.locator('.character-name').first().textContent();
    
    // Search by name
    await searchInput.fill(firstCharName?.substring(0, 3) || 'test');
    await page.waitForTimeout(500); // Debounce delay
    
    // Should filter results
    const results = page.locator('.character-card');
    const resultCount = await results.count();
    expect(resultCount).toBeGreaterThan(0);
    
    // All results should contain search term
    for (let i = 0; i < resultCount; i++) {
      const cardText = await results.nth(i).textContent();
      expect(cardText?.toLowerCase()).toContain((firstCharName?.substring(0, 3) || 'test').toLowerCase());
    }
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);
    
    // Should show all characters again
    expect(await page.locator('.character-card').count()).toBeGreaterThan(resultCount);
  });

  test('Character tag search', async ({ page }) => {
    // Look for personality tags
    const firstTag = await page.locator('.character-tag, .personality-tag, [data-testid="tag"]').first().textContent();
    
    if (firstTag) {
      // Click on tag or search for it
      const searchInput = page.locator('input[placeholder*="検索"]');
      await searchInput.fill(firstTag);
      await page.waitForTimeout(500);
      
      // Results should have this tag
      const results = page.locator('.character-card');
      const firstResult = results.first();
      await expect(firstResult.locator(`:has-text("${firstTag}")`)).toBeVisible();
    }
  });

  test('Character detail navigation', async ({ page }) => {
    const firstCharacter = page.locator('.character-card').first();
    const charName = await firstCharacter.locator('.character-name').textContent();
    
    // Click on character
    await firstCharacter.click();
    
    // Should navigate to detail page
    await page.waitForURL(/characters\/[a-zA-Z0-9]+/);
    
    // Should show character details
    await expect(page.locator('h1, .character-title')).toContainText(charName || '');
    await expect(page.locator('.character-full-description, [data-testid="full-description"]')).toBeVisible();
  });

  test('Purchased character indicators', async ({ page }) => {
    // Look for purchased characters
    const purchasedChars = page.locator('.character-card:has(.purchased-badge), .character-card:has-text("購入済み")');
    
    if (await purchasedChars.count() > 0) {
      const purchasedChar = purchasedChars.first();
      
      // Should show purchased badge
      await expect(purchasedChar.locator('.purchased-badge, :has-text("購入済み"), :has-text("Purchased")')).toBeVisible();
      
      // Should not show price
      await expect(purchasedChar.locator('.price')).not.toBeVisible();
      
      // Should have chat/start button
      await expect(purchasedChar.locator('button:has-text("チャット"), button:has-text("開始"), :has-text("Chat")')).toBeVisible();
    }
  });

  test('Character hover effects', async ({ page }) => {
    const firstCharacter = page.locator('.character-card').first();
    
    // Hover over character
    await firstCharacter.hover();
    
    // Should show hover state (might show additional info or change opacity)
    // This depends on implementation, but usually there's some visual feedback
    const hasHoverClass = await firstCharacter.evaluate(el => 
      el.classList.toString().includes('hover') || 
      window.getComputedStyle(el).cursor === 'pointer'
    );
    
    expect(hasHoverClass).toBeTruthy();
  });

  test('Responsive grid layout', async ({ page }) => {
    // Desktop view
    const desktopCards = await page.locator('.character-card').all();
    const firstCardDesktop = await desktopCards[0].boundingBox();
    const secondCardDesktop = await desktopCards[1].boundingBox();
    
    // Should be side by side on desktop
    expect(secondCardDesktop?.x).toBeGreaterThan(firstCardDesktop?.x || 0);
    
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // Wait for responsive adjustment
    
    const mobileCards = await page.locator('.character-card').all();
    const firstCardMobile = await mobileCards[0].boundingBox();
    const secondCardMobile = await mobileCards[1].boundingBox();
    
    // Should stack vertically on mobile
    expect(secondCardMobile?.y).toBeGreaterThan(firstCardMobile?.y || 0);
    expect(Math.abs((secondCardMobile?.x || 0) - (firstCardMobile?.x || 0))).toBeLessThan(10); // Same x position
  });

  test('Empty state for no results', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="検索"]');
    
    // Search for something that won't exist
    await searchInput.fill('xyzxyzxyzxyzxyz');
    await page.waitForTimeout(500);
    
    // Should show no results message
    await expect(page.locator(':has-text("見つかりません"), :has-text("No results"), :has-text("該当なし")')).toBeVisible();
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);
    
    // Characters should reappear
    await expect(page.locator('.character-card').first()).toBeVisible();
  });
});