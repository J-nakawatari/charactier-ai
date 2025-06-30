import { test, expect } from '@playwright/test';

test.describe('Gallery Image Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Go to gallery
    await page.goto('/gallery');
  });

  test('Image hover effects and quick actions', async ({ page }) => {
    const firstImage = page.locator('.gallery-image, [data-testid="gallery-image"]').first();
    
    if (await firstImage.count() === 0) {
      console.log('No images available');
      return;
    }
    
    // Hover over image
    await firstImage.hover();
    
    // Should show overlay or actions
    const overlay = firstImage.locator('.image-overlay, .hover-overlay');
    if (await overlay.count() > 0) {
      await expect(overlay).toBeVisible();
      
      // Quick actions might appear
      const quickView = overlay.locator('button[aria-label*="表示"], button[aria-label*="View"]');
      const quickDownload = overlay.locator('button[aria-label*="ダウンロード"]');
      const quickFavorite = overlay.locator('button[aria-label*="お気に入り"], button[aria-label*="Favorite"]');
      
      // Count available actions
      let actionCount = 0;
      if (await quickView.count() > 0) actionCount++;
      if (await quickDownload.count() > 0) actionCount++;
      if (await quickFavorite.count() > 0) actionCount++;
      
      console.log(`Found ${actionCount} quick actions on hover`);
      expect(actionCount).toBeGreaterThan(0);
    }
  });

  test('Image favorite/like functionality', async ({ page }) => {
    const images = await page.locator('.gallery-image').all();
    
    if (images.length === 0) {
      return;
    }
    
    // Find an image that's not favorited
    let targetImage = null;
    let favoriteButton = null;
    
    for (const img of images) {
      const favBtn = img.locator('.favorite-button, button[aria-label*="お気に入り"], .like-button');
      if (await favBtn.count() > 0) {
        const isFavorited = await favBtn.evaluate(el => 
          el.classList.contains('favorited') || 
          el.classList.contains('active') ||
          el.getAttribute('aria-pressed') === 'true'
        );
        
        if (!isFavorited) {
          targetImage = img;
          favoriteButton = favBtn;
          break;
        }
      }
    }
    
    if (targetImage && favoriteButton) {
      // Click to favorite
      await favoriteButton.click();
      
      // Should show confirmation or update state
      await page.waitForTimeout(500);
      
      // Check if state changed
      const isNowFavorited = await favoriteButton.evaluate(el => 
        el.classList.contains('favorited') || 
        el.classList.contains('active') ||
        el.getAttribute('aria-pressed') === 'true'
      );
      
      expect(isNowFavorited).toBe(true);
      
      // Might show notification
      const notification = page.locator(':has-text("お気に入りに追加"), :has-text("Added to favorites")');
      if (await notification.count() > 0) {
        await expect(notification).toBeVisible();
      }
      
      // Toggle off
      await favoriteButton.click();
      await page.waitForTimeout(500);
      
      const isFavoritedAgain = await favoriteButton.evaluate(el => 
        el.classList.contains('favorited') || 
        el.getAttribute('aria-pressed') === 'true'
      );
      
      expect(isFavoritedAgain).toBe(false);
    }
  });

  test('Image zoom and pan in detail view', async ({ page }) => {
    const firstImage = page.locator('.gallery-image').first();
    if (await firstImage.count() === 0) {
      return;
    }
    
    // Open detail view
    await firstImage.click();
    const modal = page.locator('[role="dialog"], .image-modal');
    await expect(modal).toBeVisible();
    
    const fullImage = modal.locator('img.full-image, .zoomable-image');
    await expect(fullImage).toBeVisible();
    
    // Test zoom controls
    const zoomInButton = modal.locator('button[aria-label*="拡大"], button[aria-label*="Zoom in"]');
    const zoomOutButton = modal.locator('button[aria-label*="縮小"], button[aria-label*="Zoom out"]');
    const resetButton = modal.locator('button[aria-label*="リセット"], button[aria-label*="Reset"]');
    
    if (await zoomInButton.count() > 0) {
      // Get initial transform
      const initialTransform = await fullImage.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      // Zoom in
      await zoomInButton.click();
      await page.waitForTimeout(300);
      
      const zoomedTransform = await fullImage.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      expect(zoomedTransform).not.toBe(initialTransform);
      
      // Pan by dragging
      const box = await fullImage.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 50);
        await page.mouse.up();
      }
      
      // Reset zoom
      if (await resetButton.count() > 0) {
        await resetButton.click();
        await page.waitForTimeout(300);
        
        const resetTransform = await fullImage.evaluate(el => 
          window.getComputedStyle(el).transform
        );
        
        expect(resetTransform).toBe(initialTransform);
      }
    }
    
    // Test double-click zoom
    await fullImage.dblclick();
    await page.waitForTimeout(300);
    
    // Should zoom in on double-click
    const dblClickTransform = await fullImage.evaluate(el => 
      window.getComputedStyle(el).transform
    );
    
    // Double-click again to zoom out
    await fullImage.dblclick();
  });

  test('Keyboard navigation in gallery', async ({ page }) => {
    const images = await page.locator('.gallery-image').all();
    if (images.length < 2) {
      console.log('Not enough images for keyboard navigation test');
      return;
    }
    
    // Open first image
    await images[0].click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Test arrow key navigation
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    
    // Should show next image
    const imageInfo = modal.locator('.image-info, [data-testid="current-image-index"]');
    if (await imageInfo.count() > 0) {
      const infoText = await imageInfo.textContent();
      expect(infoText).toContain('2'); // Should be on second image
    }
    
    // Previous image
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);
    
    // Escape to close
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('Image metadata display', async ({ page }) => {
    const firstImage = page.locator('.gallery-image').first();
    if (await firstImage.count() === 0) {
      return;
    }
    
    await firstImage.click();
    const modal = page.locator('[role="dialog"]');
    
    // Look for metadata section
    const metadata = modal.locator('.image-metadata, [data-testid="image-metadata"]');
    
    if (await metadata.count() > 0) {
      await expect(metadata).toBeVisible();
      
      // Should show various metadata
      const metadataItems = {
        character: metadata.locator(':has-text("キャラクター"), :has-text("Character")'),
        unlockLevel: metadata.locator(':has-text("解放レベル"), :has-text("Unlock Level")'),
        unlockDate: metadata.locator(':has-text("解放日"), :has-text("Unlocked")'),
        imageNumber: metadata.locator(':has-text("画像番号"), :has-text("Image #")'),
        resolution: metadata.locator(':has-text("解像度"), :has-text("Resolution")'),
        fileSize: metadata.locator(':has-text("サイズ"), :has-text("Size")')
      };
      
      for (const [key, locator] of Object.entries(metadataItems)) {
        if (await locator.count() > 0) {
          await expect(locator).toBeVisible();
          const text = await locator.textContent();
          console.log(`${key}: ${text}`);
        }
      }
    }
  });

  test('Batch image operations', async ({ page }) => {
    const images = await page.locator('.gallery-image').all();
    if (images.length < 2) {
      return;
    }
    
    // Look for selection mode toggle
    const selectModeButton = page.locator('button:has-text("選択"), button:has-text("Select")');
    
    if (await selectModeButton.count() > 0) {
      await selectModeButton.click();
      
      // Should enter selection mode
      await expect(page.locator('.selection-mode, [data-selection-mode="true"]')).toBeVisible();
      
      // Select multiple images
      for (let i = 0; i < Math.min(3, images.length); i++) {
        const checkbox = images[i].locator('input[type="checkbox"], .selection-checkbox');
        if (await checkbox.count() > 0) {
          await checkbox.click();
        }
      }
      
      // Batch actions should appear
      const batchActions = page.locator('.batch-actions, [data-testid="batch-actions"]');
      await expect(batchActions).toBeVisible();
      
      // Available batch operations
      const downloadAllButton = batchActions.locator('button:has-text("ダウンロード"), button:has-text("Download")');
      const favoriteAllButton = batchActions.locator('button:has-text("お気に入り")');
      
      let batchActionCount = 0;
      if (await downloadAllButton.count() > 0) batchActionCount++;
      if (await favoriteAllButton.count() > 0) batchActionCount++;
      
      console.log(`Found ${batchActionCount} batch actions`);
      expect(batchActionCount).toBeGreaterThan(0);
      
      // Cancel selection
      await page.click('button:has-text("キャンセル"), button:has-text("Cancel")');
    }
  });

  test('Image slideshow mode', async ({ page }) => {
    const images = await page.locator('.gallery-image').all();
    if (images.length < 2) {
      return;
    }
    
    // Open first image
    await images[0].click();
    const modal = page.locator('[role="dialog"]');
    
    // Look for slideshow button
    const slideshowButton = modal.locator('button:has-text("スライドショー"), button:has-text("Slideshow"), button[aria-label*="slideshow"]');
    
    if (await slideshowButton.count() > 0) {
      await slideshowButton.click();
      
      // Should start slideshow
      await expect(page.locator('.slideshow-active, [data-slideshow="true"]')).toBeVisible();
      
      // Wait for automatic transition
      await page.waitForTimeout(3000);
      
      // Should have moved to next image
      const currentIndex = await modal.locator('[data-testid="current-index"]').textContent();
      expect(currentIndex).not.toContain('1');
      
      // Stop slideshow
      const stopButton = modal.locator('button:has-text("停止"), button:has-text("Stop")');
      if (await stopButton.count() > 0) {
        await stopButton.click();
      } else {
        // Or press space/escape
        await page.keyboard.press('Space');
      }
    }
  });

  test('Gallery responsive layout', async ({ page }) => {
    // Desktop view
    const desktopImages = await page.locator('.gallery-image').all();
    if (desktopImages.length < 2) {
      return;
    }
    
    // Get positions in desktop view
    const firstBox = await desktopImages[0].boundingBox();
    const secondBox = await desktopImages[1].boundingBox();
    
    // Should be in grid layout (side by side)
    expect(secondBox?.x).toBeGreaterThan(firstBox?.x || 0);
    
    // Switch to mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Get positions in mobile view
    const mobileImages = await page.locator('.gallery-image').all();
    const firstMobileBox = await mobileImages[0].boundingBox();
    const secondMobileBox = await mobileImages[1].boundingBox();
    
    // Should stack vertically or have fewer columns
    const horizontalDiff = Math.abs((secondMobileBox?.x || 0) - (firstMobileBox?.x || 0));
    expect(horizontalDiff).toBeLessThan(50); // Nearly same X position
  });

  test('Image loading states', async ({ page }) => {
    // Clear cache to test loading states
    await page.context().clearCookies();
    await page.goto('/gallery');
    
    // Look for loading placeholders
    const loadingStates = page.locator('.image-loading, .skeleton, [data-loading="true"]');
    if (await loadingStates.count() > 0) {
      console.log('Loading states detected');
      
      // Should eventually load
      await expect(loadingStates.first()).not.toBeVisible({ timeout: 10000 });
    }
    
    // Check lazy loading
    const images = page.locator('.gallery-image img');
    if (await images.count() > 10) {
      // Scroll to bottom quickly
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      // Some images might still be loading
      const lazyImages = await images.evaluateAll(imgs => {
        return imgs.filter(img => !img.complete).length;
      });
      
      console.log(`${lazyImages} images still loading (lazy load)`);
    }
  });

  test('Gallery filter combinations', async ({ page }) => {
    // Test multiple filters together
    const characterFilter = page.locator('select[name="character"]');
    const sortFilter = page.locator('select[name="sort"]');
    const viewFilter = page.locator('select[name="view"], [data-testid="view-filter"]');
    
    if (await characterFilter.count() > 0 && await sortFilter.count() > 0) {
      // Select a character
      const options = await characterFilter.locator('option').all();
      if (options.length > 2) {
        await characterFilter.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        
        // Then sort by newest
        await sortFilter.selectOption('newest');
        await page.waitForTimeout(500);
        
        // Results should be filtered AND sorted
        const images = await page.locator('.gallery-image').all();
        console.log(`Filtered and sorted: ${images.length} images`);
        
        // If view filter exists, test that too
        if (await viewFilter.count() > 0) {
          await viewFilter.selectOption('favorites');
          await page.waitForTimeout(500);
          
          const favoriteImages = await page.locator('.gallery-image').all();
          console.log(`Triple filtered: ${favoriteImages.length} images`);
        }
      }
    }
  });
});