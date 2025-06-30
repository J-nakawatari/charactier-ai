import { test, expect } from '@playwright/test';

test.describe('Character Detail Page', () => {
  let characterId: string;
  
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Get a character ID from the list
    await page.goto('/characters');
    const firstCharacter = page.locator('.character-card').first();
    await firstCharacter.click();
    
    // Extract character ID from URL
    await page.waitForURL(/characters\/([a-zA-Z0-9]+)/);
    const url = page.url();
    const match = url.match(/characters\/([a-zA-Z0-9]+)/);
    characterId = match?.[1] || '';
  });

  test('Character detail page display', async ({ page }) => {
    // Already on character detail page from beforeEach
    
    // Should display character information
    await expect(page.locator('h1, .character-name')).toBeVisible();
    await expect(page.locator('.character-description, [data-testid="description"]')).toBeVisible();
    
    // Should show character images
    await expect(page.locator('.character-main-image, .character-avatar, img[alt*="character"]')).toBeVisible();
    
    // Should show personality tags
    await expect(page.locator('.personality-tag, .character-tag, [data-testid="personality-tag"]').first()).toBeVisible();
    
    // Should show appropriate action button
    const actionButton = page.locator('button:has-text("チャットを開始"), button:has-text("購入"), button:has-text("Start Chat"), button:has-text("Purchase")');
    await expect(actionButton).toBeVisible();
  });

  test('Free character detail view', async ({ page }) => {
    // Navigate to a free character
    await page.goto('/characters');
    const freeCharacter = page.locator('.character-card:has(.free-badge), .character-card:has-text("無料")').first();
    
    if (await freeCharacter.count() > 0) {
      await freeCharacter.click();
      await page.waitForURL(/characters\/[a-zA-Z0-9]+/);
      
      // Should not show price
      await expect(page.locator('.price, [data-testid="price"]')).not.toBeVisible();
      
      // Should show chat start button
      await expect(page.locator('button:has-text("チャットを開始"), button:has-text("Start Chat")')).toBeVisible();
      
      // Should show "Free" badge
      await expect(page.locator('.free-badge, :has-text("無料"), :has-text("Free")')).toBeVisible();
    }
  });

  test('Paid character detail view (not purchased)', async ({ page }) => {
    // Navigate to an unpurchased paid character
    await page.goto('/characters');
    const paidCharacter = page.locator('.character-card:has(.price):not(:has(.purchased-badge))').first();
    
    if (await paidCharacter.count() > 0) {
      await paidCharacter.click();
      await page.waitForURL(/characters\/[a-zA-Z0-9]+/);
      
      // Should show price
      const priceElement = page.locator('.price, [data-testid="price"]');
      await expect(priceElement).toBeVisible();
      await expect(priceElement).toContainText('円');
      
      // Should show purchase button with price
      const purchaseButton = page.locator('button:has-text("購入"), button:has-text("Purchase")');
      await expect(purchaseButton).toBeVisible();
      await expect(purchaseButton).toContainText('円');
      
      // Should not show chat button
      await expect(page.locator('button:has-text("チャットを開始")')).not.toBeVisible();
    }
  });

  test('Purchased character detail view', async ({ page }) => {
    // Navigate to a purchased character
    await page.goto('/characters');
    const purchasedCharacter = page.locator('.character-card:has(.purchased-badge)').first();
    
    if (await purchasedCharacter.count() > 0) {
      await purchasedCharacter.click();
      await page.waitForURL(/characters\/[a-zA-Z0-9]+/);
      
      // Should not show price or purchase button
      await expect(page.locator('.price')).not.toBeVisible();
      await expect(page.locator('button:has-text("購入")')).not.toBeVisible();
      
      // Should show chat start button
      await expect(page.locator('button:has-text("チャットを開始"), button:has-text("Start Chat")')).toBeVisible();
      
      // Should show purchased indicator
      await expect(page.locator('.purchased-badge, :has-text("購入済み"), :has-text("Purchased")')).toBeVisible();
    }
  });

  test('Character affinity display', async ({ page }) => {
    // If user has chatted with character, should show affinity
    const affinitySection = page.locator('.affinity-section, [data-testid="affinity-section"]');
    
    if (await affinitySection.count() > 0) {
      await expect(affinitySection).toBeVisible();
      
      // Should show level
      await expect(affinitySection.locator(':has-text("レベル"), :has-text("Level")')).toBeVisible();
      
      // Should show progress bar
      await expect(affinitySection.locator('.progress-bar, [role="progressbar"]')).toBeVisible();
      
      // Should show unlocked images count
      await expect(affinitySection.locator(':has-text("枚"), :has-text("images")')).toBeVisible();
    }
  });

  test('Character gallery preview', async ({ page }) => {
    // Should show gallery preview or link
    const gallerySection = page.locator('.gallery-preview, [data-testid="gallery-preview"], :has-text("ギャラリー")');
    
    if (await gallerySection.count() > 0) {
      await expect(gallerySection).toBeVisible();
      
      // Might show preview images
      const previewImages = gallerySection.locator('img, .preview-image');
      if (await previewImages.count() > 0) {
        await expect(previewImages.first()).toBeVisible();
      }
      
      // Should have link to full gallery
      const galleryLink = page.locator('a:has-text("ギャラリーを見る"), a:has-text("View Gallery")');
      if (await galleryLink.count() > 0) {
        await galleryLink.click();
        await expect(page).toHaveURL(/gallery|library/);
      }
    }
  });

  test('Character personality and traits', async ({ page }) => {
    // Should display personality information
    const personalitySection = page.locator('.personality-section, [data-testid="personality"]');
    await expect(personalitySection).toBeVisible();
    
    // Should show personality preset
    await expect(personalitySection.locator('.personality-preset, :has-text("性格")')).toBeVisible();
    
    // Should show personality tags
    const tags = personalitySection.locator('.tag, .personality-tag');
    await expect(tags).toHaveCount(await tags.count());
    expect(await tags.count()).toBeGreaterThan(0);
  });

  test('Start chat navigation', async ({ page }) => {
    // Find a character that can be chatted with (free or purchased)
    await page.goto('/characters');
    const chattableChar = page.locator('.character-card:has(.free-badge), .character-card:has(.purchased-badge)').first();
    
    if (await chattableChar.count() > 0) {
      await chattableChar.click();
      await page.waitForURL(/characters\/[a-zA-Z0-9]+/);
      
      // Click start chat
      await page.click('button:has-text("チャットを開始"), button:has-text("Start Chat")');
      
      // Should navigate to chat
      await page.waitForURL(/chat/);
      
      // Should load chat interface
      await expect(page.locator('.chat-interface, [data-testid="chat-interface"]')).toBeVisible();
    }
  });

  test('Back to list navigation', async ({ page }) => {
    // Should have back button or breadcrumb
    const backButton = page.locator('a:has-text("戻る"), a:has-text("Back"), .breadcrumb');
    await expect(backButton).toBeVisible();
    
    await backButton.click();
    
    // Should return to character list
    await expect(page).toHaveURL(/characters$/);
    await expect(page.locator('.character-grid, .character-list')).toBeVisible();
  });

  test('Character metadata display', async ({ page }) => {
    // Should show additional character info if available
    const metadata = {
      voice: page.locator(':has-text("ボイス"), :has-text("Voice")'),
      age: page.locator(':has-text("年齢"), :has-text("Age")'),
      gender: page.locator(':has-text("性別"), :has-text("Gender")'),
      occupation: page.locator(':has-text("職業"), :has-text("Occupation")')
    };
    
    // Check which metadata is displayed (varies by character)
    for (const [key, locator] of Object.entries(metadata)) {
      if (await locator.count() > 0) {
        await expect(locator).toBeVisible();
        console.log(`Character has ${key} metadata`);
      }
    }
  });
});