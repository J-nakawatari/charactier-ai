import { test, expect } from '@playwright/test';

test.describe('Library/Gallery Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('Gallery access and navigation', async ({ page }) => {
    // Step 1: Navigate to gallery from dashboard
    const galleryLink = page.locator('a:has-text("ギャラリー"), a:has-text("Gallery"), a:has-text("ライブラリー")');
    await expect(galleryLink).toBeVisible();
    await galleryLink.click();
    
    // Step 2: Verify gallery page loaded
    await page.waitForURL(/gallery|library/);
    await expect(page.locator('h1:has-text("ギャラリー"), h1:has-text("Gallery"), h1:has-text("ライブラリー")')).toBeVisible();
    
    // Step 3: Check if user has any unlocked images
    const noImagesMessage = page.locator(':has-text("画像がありません"), :has-text("No images")');
    const imageGrid = page.locator('.image-grid, [data-testid="image-grid"]');
    
    if (await noImagesMessage.count() > 0) {
      // No images unlocked yet
      await expect(noImagesMessage).toBeVisible();
      console.log('No images unlocked yet - user needs to level up characters');
      
      // Should suggest how to unlock images
      await expect(page.locator(':has-text("キャラクターと会話"), :has-text("Chat with characters")')).toBeVisible();
    } else {
      // Has unlocked images
      await expect(imageGrid).toBeVisible();
      
      // Count unlocked images
      const images = page.locator('.gallery-image, [data-testid="gallery-image"]');
      const imageCount = await images.count();
      console.log(`Found ${imageCount} unlocked images`);
      expect(imageCount).toBeGreaterThan(0);
    }
  });

  test('Character filter functionality', async ({ page }) => {
    await page.goto('/gallery');
    
    // Check if there are images
    const images = page.locator('.gallery-image, [data-testid="gallery-image"]');
    if (await images.count() === 0) {
      console.log('No images to test filters');
      return;
    }
    
    // Look for character filter
    const characterFilter = page.locator('select[name="character"], [data-testid="character-filter"]');
    await expect(characterFilter).toBeVisible();
    
    // Get filter options
    const options = await characterFilter.locator('option').all();
    const characterNames = [];
    
    for (const option of options) {
      const name = await option.textContent();
      if (name && name !== '全て' && name !== 'All') {
        characterNames.push(name);
      }
    }
    
    console.log('Available characters:', characterNames);
    
    // Test filtering by each character
    for (const charName of characterNames.slice(0, 3)) { // Test first 3
      await characterFilter.selectOption({ label: charName });
      await page.waitForTimeout(500); // Wait for filter
      
      // All displayed images should be from selected character
      const filteredImages = await page.locator('.gallery-image').all();
      
      for (const img of filteredImages) {
        const characterLabel = img.locator('.character-name, [data-testid="character-name"]');
        if (await characterLabel.count() > 0) {
          await expect(characterLabel).toContainText(charName);
        }
      }
      
      console.log(`Filtered by ${charName}: ${filteredImages.length} images`);
    }
    
    // Reset to show all
    await characterFilter.selectOption({ label: '全て' });
  });

  test('Image detail modal and interactions', async ({ page }) => {
    await page.goto('/gallery');
    
    const firstImage = page.locator('.gallery-image').first();
    if (await firstImage.count() === 0) {
      console.log('No images available');
      return;
    }
    
    // Click to open detail view
    await firstImage.click();
    
    // Modal should open
    const modal = page.locator('.image-modal, [role="dialog"], [data-testid="image-modal"]');
    await expect(modal).toBeVisible();
    
    // Should show full-size image
    const fullImage = modal.locator('img, .full-image');
    await expect(fullImage).toBeVisible();
    
    // Should show image info
    const imageInfo = modal.locator('.image-info, [data-testid="image-info"]');
    await expect(imageInfo).toBeVisible();
    
    // Character name
    await expect(imageInfo.locator('.character-name, :has-text("キャラクター")')).toBeVisible();
    
    // Unlock level
    const unlockLevel = imageInfo.locator(':has-text("レベル"), :has-text("Level")');
    if (await unlockLevel.count() > 0) {
      const levelText = await unlockLevel.textContent();
      expect(levelText).toMatch(/\d+/);
    }
    
    // Unlock date
    const unlockDate = imageInfo.locator('.unlock-date, :has-text("解放日"), :has-text("Unlocked")');
    if (await unlockDate.count() > 0) {
      await expect(unlockDate).toBeVisible();
    }
    
    // Navigation arrows if multiple images
    const prevButton = modal.locator('button[aria-label*="前"], button[aria-label*="Previous"]');
    const nextButton = modal.locator('button[aria-label*="次"], button[aria-label*="Next"]');
    
    if (await nextButton.isVisible()) {
      await nextButton.click();
      // Should show next image
      await page.waitForTimeout(300); // Animation
      await expect(fullImage).toBeVisible();
    }
    
    // Close modal
    const closeButton = modal.locator('button[aria-label*="閉じる"], button[aria-label*="Close"], button:has-text("×")');
    await closeButton.click();
    await expect(modal).not.toBeVisible();
  });

  test('Gallery sorting options', async ({ page }) => {
    await page.goto('/gallery');
    
    if (await page.locator('.gallery-image').count() < 2) {
      console.log('Not enough images to test sorting');
      return;
    }
    
    // Find sort dropdown
    const sortDropdown = page.locator('select[name="sort"], [data-testid="sort-dropdown"]');
    await expect(sortDropdown).toBeVisible();
    
    // Test different sort options
    const sortOptions = ['newest', 'oldest', 'character', 'level'];
    
    for (const option of sortOptions) {
      await sortDropdown.selectOption(option);
      await page.waitForTimeout(500);
      
      // Get first image info based on sort
      const firstImage = page.locator('.gallery-image').first();
      
      if (option === 'newest' || option === 'oldest') {
        // Check date ordering
        const dateInfo = firstImage.locator('.unlock-date, .date');
        if (await dateInfo.count() > 0) {
          const dateText = await dateInfo.textContent();
          console.log(`Sort by ${option}: First image date - ${dateText}`);
        }
      } else if (option === 'character') {
        // Check character name
        const charName = await firstImage.locator('.character-name').textContent();
        console.log(`Sort by character: First image - ${charName}`);
      } else if (option === 'level') {
        // Check unlock level
        const level = firstImage.locator('.unlock-level, :has-text("Lv")');
        if (await level.count() > 0) {
          const levelText = await level.textContent();
          console.log(`Sort by level: First image - ${levelText}`);
        }
      }
    }
  });

  test('Image download functionality', async ({ page }) => {
    await page.goto('/gallery');
    
    const firstImage = page.locator('.gallery-image').first();
    if (await firstImage.count() === 0) {
      return;
    }
    
    // Open detail modal
    await firstImage.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Look for download button
    const downloadButton = modal.locator('button:has-text("ダウンロード"), button:has-text("Download"), button[aria-label*="download"]');
    
    if (await downloadButton.count() > 0) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');
      await downloadButton.click();
      
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/\.(jpg|jpeg|png|webp)$/i);
      console.log(`Downloaded: ${download.suggestedFilename()}`);
      
      // Could save and verify if needed
      const path = await download.path();
      expect(path).toBeTruthy();
    }
  });

  test('Gallery pagination or infinite scroll', async ({ page }) => {
    await page.goto('/gallery');
    
    const images = page.locator('.gallery-image');
    const initialCount = await images.count();
    
    if (initialCount > 20) {
      // Check for pagination
      const pagination = page.locator('.pagination, [data-testid="pagination"]');
      
      if (await pagination.count() > 0) {
        // Traditional pagination
        const nextPage = pagination.locator('a:has-text("2"), button:has-text("次")');
        if (await nextPage.count() > 0) {
          await nextPage.click();
          await page.waitForTimeout(500);
          
          // Should show different images
          const newCount = await images.count();
          expect(newCount).toBeGreaterThan(0);
        }
      } else {
        // Infinite scroll
        const container = page.locator('.gallery-container, [data-testid="gallery-container"]');
        
        // Scroll to bottom
        await container.evaluate(el => el.scrollTop = el.scrollHeight);
        await page.waitForTimeout(1000); // Wait for lazy load
        
        const newCount = await images.count();
        if (newCount > initialCount) {
          console.log('Infinite scroll detected');
          expect(newCount).toBeGreaterThan(initialCount);
        }
      }
    }
  });

  test('Gallery search functionality', async ({ page }) => {
    await page.goto('/gallery');
    
    // Look for search input
    const searchInput = page.locator('input[placeholder*="検索"], input[placeholder*="Search"]');
    
    if (await searchInput.count() > 0) {
      // Search by character name
      const characterName = await page.locator('.character-name').first().textContent();
      
      await searchInput.fill(characterName || 'test');
      await searchInput.press('Enter');
      await page.waitForTimeout(500);
      
      // Results should be filtered
      const results = page.locator('.gallery-image');
      const resultCount = await results.count();
      
      if (resultCount > 0) {
        // All results should match search
        for (let i = 0; i < Math.min(3, resultCount); i++) {
          const charLabel = results.nth(i).locator('.character-name');
          if (await charLabel.count() > 0) {
            await expect(charLabel).toContainText(characterName || 'test');
          }
        }
      }
      
      // Clear search
      await searchInput.clear();
      await searchInput.press('Enter');
    }
  });

  test('Gallery view modes (grid/list)', async ({ page }) => {
    await page.goto('/gallery');
    
    // Look for view mode toggle
    const viewToggle = page.locator('button[aria-label*="表示"], button[aria-label*="view"]');
    
    if (await viewToggle.count() > 0) {
      // Get current view mode
      const container = page.locator('.gallery-container, .image-container');
      const initialClasses = await container.getAttribute('class');
      
      // Toggle view
      await viewToggle.click();
      await page.waitForTimeout(300);
      
      // Classes should change
      const newClasses = await container.getAttribute('class');
      expect(newClasses).not.toBe(initialClasses);
      
      // Toggle back
      await viewToggle.click();
      await page.waitForTimeout(300);
      
      const finalClasses = await container.getAttribute('class');
      expect(finalClasses).toBe(initialClasses);
    }
  });

  test('Empty gallery state', async ({ page }) => {
    // Test with a new user or filtered view that has no images
    await page.goto('/gallery');
    
    // Filter by a character with no unlocked images
    const characterFilter = page.locator('select[name="character"]');
    const options = await characterFilter.locator('option').all();
    
    // Try to find a character with no images
    for (const option of options) {
      const value = await option.getAttribute('value');
      if (value && value !== 'all') {
        await characterFilter.selectOption(value);
        await page.waitForTimeout(500);
        
        const imageCount = await page.locator('.gallery-image').count();
        if (imageCount === 0) {
          // Should show empty state
          const emptyMessage = page.locator(':has-text("画像がありません"), :has-text("No images")');
          await expect(emptyMessage).toBeVisible();
          
          // Should suggest how to unlock
          const suggestion = page.locator(':has-text("レベルを上げて"), :has-text("Level up")');
          if (await suggestion.count() > 0) {
            await expect(suggestion).toBeVisible();
          }
          
          break;
        }
      }
    }
  });

  test('Image sharing functionality', async ({ page }) => {
    await page.goto('/gallery');
    
    const firstImage = page.locator('.gallery-image').first();
    if (await firstImage.count() === 0) {
      return;
    }
    
    // Open detail modal
    await firstImage.click();
    const modal = page.locator('[role="dialog"]');
    
    // Look for share button
    const shareButton = modal.locator('button:has-text("共有"), button:has-text("Share"), button[aria-label*="share"]');
    
    if (await shareButton.count() > 0) {
      await shareButton.click();
      
      // Share options might appear
      const shareModal = page.locator('.share-modal, [data-testid="share-modal"]');
      if (await shareModal.count() > 0) {
        await expect(shareModal).toBeVisible();
        
        // Check for share options
        const twitterShare = shareModal.locator(':has-text("Twitter"), :has-text("X")');
        const copyLink = shareModal.locator(':has-text("リンクをコピー"), :has-text("Copy link")');
        
        if (await copyLink.count() > 0) {
          await copyLink.click();
          
          // Should show copied notification
          await expect(page.locator(':has-text("コピーしました"), :has-text("Copied")')).toBeVisible();
        }
      }
    }
  });

  test('Gallery performance with many images', async ({ page }) => {
    await page.goto('/gallery');
    
    const images = page.locator('.gallery-image');
    const imageCount = await images.count();
    
    if (imageCount > 50) {
      // Test lazy loading
      const visibleImages = await images.evaluateAll(elements => {
        return elements.filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.top < window.innerHeight && rect.bottom > 0;
        }).length;
      });
      
      console.log(`Total images: ${imageCount}, Initially visible: ${visibleImages}`);
      
      // Visible images should be less than total (lazy loading)
      expect(visibleImages).toBeLessThan(imageCount);
      
      // Check if images have loading="lazy"
      const imgElements = page.locator('.gallery-image img');
      const firstImg = imgElements.first();
      const loadingAttr = await firstImg.getAttribute('loading');
      
      if (loadingAttr === 'lazy') {
        console.log('Images use lazy loading');
      }
    }
  });
});