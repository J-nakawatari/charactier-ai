import { test, expect } from '@playwright/test';

test.describe('Character-specific Gallery Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('Character gallery access from character page', async ({ page }) => {
    // Go to characters
    await page.goto('/characters');
    
    // Find a character with unlocked images (high affinity)
    const characters = await page.locator('.character-card').all();
    let foundCharacterWithImages = false;
    
    for (const char of characters) {
      // Look for affinity indicator
      const affinityBadge = char.locator('.affinity-badge, :has-text("Lv")');
      if (await affinityBadge.count() > 0) {
        const levelText = await affinityBadge.textContent();
        const level = parseInt(levelText?.match(/\d+/)?.[0] || '0');
        
        if (level >= 10) { // Should have at least 1 image
          await char.click();
          foundCharacterWithImages = true;
          break;
        }
      }
    }
    
    if (!foundCharacterWithImages) {
      console.log('No characters with unlocked images found');
      return;
    }
    
    // On character detail page
    await page.waitForURL(/characters\/[a-zA-Z0-9]+/);
    
    // Should have gallery section or link
    const gallerySection = page.locator('.character-gallery, [data-testid="character-gallery"], :has-text("ギャラリー")');
    await expect(gallerySection).toBeVisible();
    
    // Click to view character gallery
    const galleryLink = page.locator('a:has-text("ギャラリーを見る"), button:has-text("画像を見る"), a:has-text("View Gallery")');
    if (await galleryLink.count() > 0) {
      await galleryLink.click();
      
      // Should navigate to gallery filtered by character
      await page.waitForURL(/gallery/);
      
      // Character filter should be pre-selected
      const characterFilter = page.locator('select[name="character"]');
      const selectedValue = await characterFilter.inputValue();
      expect(selectedValue).not.toBe('all');
      
      // All images should be from this character
      const images = await page.locator('.gallery-image').all();
      for (const img of images.slice(0, 3)) {
        const charName = img.locator('.character-name');
        if (await charName.count() > 0) {
          const name = await charName.textContent();
          expect(name).toBeTruthy();
        }
      }
    }
  });

  test('Character image unlock progress display', async ({ page }) => {
    await page.goto('/characters');
    
    // Check multiple characters
    const characters = await page.locator('.character-card').all();
    
    for (let i = 0; i < Math.min(3, characters.length); i++) {
      const char = characters[i];
      
      // Look for unlock progress
      const progressIndicator = char.locator('.unlock-progress, [data-testid="unlock-progress"], :has-text("/10")');
      
      if (await progressIndicator.count() > 0) {
        const progressText = await progressIndicator.textContent();
        console.log(`Character ${i + 1} progress: ${progressText}`);
        
        // Should show format like "3/10 images"
        expect(progressText).toMatch(/\d+\/\d+/);
        
        // Extract numbers
        const match = progressText.match(/(\d+)\/(\d+)/);
        if (match) {
          const unlocked = parseInt(match[1]);
          const total = parseInt(match[2]);
          
          expect(unlocked).toBeGreaterThanOrEqual(0);
          expect(unlocked).toBeLessThanOrEqual(total);
          expect(total).toBe(10); // 10 images per character
        }
      }
    }
  });

  test('Next image unlock preview', async ({ page }) => {
    await page.goto('/characters');
    
    // Find a character with some progress
    const charWithProgress = page.locator('.character-card:has(.affinity-badge)').first();
    if (await charWithProgress.count() === 0) {
      return;
    }
    
    await charWithProgress.click();
    await page.waitForURL(/characters\/[a-zA-Z0-9]+/);
    
    // Look for next unlock info
    const nextUnlockSection = page.locator('.next-unlock, [data-testid="next-unlock"]');
    
    if (await nextUnlockSection.count() > 0) {
      await expect(nextUnlockSection).toBeVisible();
      
      // Should show next unlock level
      const nextLevel = nextUnlockSection.locator(':has-text("レベル"), :has-text("Level")');
      await expect(nextLevel).toBeVisible();
      
      const levelText = await nextLevel.textContent();
      const level = parseInt(levelText?.match(/\d+/)?.[0] || '0');
      
      // Should be multiple of 10
      expect(level % 10).toBe(0);
      
      // Might show preview or silhouette
      const preview = nextUnlockSection.locator('.preview-image, .silhouette');
      if (await preview.count() > 0) {
        await expect(preview).toBeVisible();
        
        // Should have blur or overlay effect
        const hasBlur = await preview.evaluate(el => 
          window.getComputedStyle(el).filter.includes('blur') ||
          el.classList.toString().includes('blur')
        );
        
        console.log('Next image preview has blur effect:', hasBlur);
      }
    }
  });

  test('Character gallery statistics', async ({ page }) => {
    await page.goto('/gallery');
    
    // Look for stats section
    const statsSection = page.locator('.gallery-stats, [data-testid="gallery-stats"]');
    
    if (await statsSection.count() > 0) {
      await expect(statsSection).toBeVisible();
      
      // Total images unlocked
      const totalUnlocked = statsSection.locator(':has-text("解放済み"), :has-text("Unlocked")');
      if (await totalUnlocked.count() > 0) {
        const totalText = await totalUnlocked.textContent();
        expect(totalText).toMatch(/\d+/);
      }
      
      // Images by character
      const characterBreakdown = statsSection.locator('.character-breakdown, [data-testid="character-stats"]');
      if (await characterBreakdown.count() > 0) {
        const charStats = await characterBreakdown.locator('.character-stat').all();
        
        for (const stat of charStats) {
          const name = await stat.locator('.character-name').textContent();
          const count = await stat.locator('.image-count').textContent();
          console.log(`${name}: ${count} images`);
        }
      }
      
      // Completion percentage
      const completion = statsSection.locator(':has-text("%"), .completion-percentage');
      if (await completion.count() > 0) {
        const percentText = await completion.textContent();
        const percent = parseInt(percentText?.match(/\d+/)?.[0] || '0');
        expect(percent).toBeGreaterThanOrEqual(0);
        expect(percent).toBeLessThanOrEqual(100);
      }
    }
  });

  test('Character gallery achievements', async ({ page }) => {
    await page.goto('/gallery');
    
    // Look for achievements section
    const achievementsButton = page.locator('button:has-text("実績"), button:has-text("Achievements")');
    
    if (await achievementsButton.count() > 0) {
      await achievementsButton.click();
      
      const achievementsModal = page.locator('.achievements-modal, [data-testid="achievements"]');
      await expect(achievementsModal).toBeVisible();
      
      // Check for gallery-related achievements
      const achievements = {
        firstImage: achievementsModal.locator(':has-text("初めての画像"), :has-text("First Image")'),
        tenImages: achievementsModal.locator(':has-text("10枚"), :has-text("10 images")'),
        fullCharacter: achievementsModal.locator(':has-text("コンプリート"), :has-text("Complete")'),
        allCharacters: achievementsModal.locator(':has-text("全キャラクター"), :has-text("All characters")')
      };
      
      for (const [key, locator] of Object.entries(achievements)) {
        if (await locator.count() > 0) {
          const isUnlocked = await locator.evaluate(el => 
            !el.classList.contains('locked') && 
            !el.classList.contains('disabled')
          );
          
          console.log(`Achievement "${key}": ${isUnlocked ? 'Unlocked' : 'Locked'}`);
          
          if (isUnlocked) {
            // Should show unlock date
            const dateText = locator.locator('.unlock-date');
            if (await dateText.count() > 0) {
              await expect(dateText).toBeVisible();
            }
          }
        }
      }
    }
  });

  test('Compare character galleries', async ({ page }) => {
    await page.goto('/gallery');
    
    // Look for compare mode
    const compareButton = page.locator('button:has-text("比較"), button:has-text("Compare")');
    
    if (await compareButton.count() > 0) {
      await compareButton.click();
      
      // Should enter compare mode
      await expect(page.locator('.compare-mode, [data-compare-mode="true"]')).toBeVisible();
      
      // Select two characters to compare
      const charSelectors = page.locator('.character-selector, select.compare-character');
      
      if (await charSelectors.count() >= 2) {
        // Select first character
        const char1Options = await charSelectors.first().locator('option').all();
        if (char1Options.length > 1) {
          await charSelectors.first().selectOption({ index: 1 });
        }
        
        // Select second character
        const char2Options = await charSelectors.nth(1).locator('option').all();
        if (char2Options.length > 2) {
          await charSelectors.nth(1).selectOption({ index: 2 });
        }
        
        // Should show comparison view
        const comparisonView = page.locator('.comparison-view, [data-testid="comparison"]');
        await expect(comparisonView).toBeVisible();
        
        // Should show stats for both
        const stats = await comparisonView.locator('.character-comparison').all();
        expect(stats.length).toBe(2);
        
        for (const stat of stats) {
          const unlocked = stat.locator(':has-text("解放"), :has-text("Unlocked")');
          const progress = stat.locator('.progress-bar, [role="progressbar"]');
          
          if (await unlocked.count() > 0) await expect(unlocked).toBeVisible();
          if (await progress.count() > 0) await expect(progress).toBeVisible();
        }
      }
    }
  });

  test('Gallery memory book view', async ({ page }) => {
    await page.goto('/gallery');
    
    // Look for memory book or album view
    const memoryBookButton = page.locator('button:has-text("思い出"), button:has-text("Memory Book"), button:has-text("アルバム")');
    
    if (await memoryBookButton.count() > 0) {
      await memoryBookButton.click();
      
      // Should show special album view
      const albumView = page.locator('.album-view, .memory-book, [data-testid="album-view"]');
      await expect(albumView).toBeVisible();
      
      // Should organize by character or chronologically
      const sections = await albumView.locator('.album-section, .memory-section').all();
      
      for (const section of sections.slice(0, 2)) {
        // Section header
        const header = section.locator('.section-header, h2, h3');
        if (await header.count() > 0) {
          const headerText = await header.textContent();
          console.log(`Album section: ${headerText}`);
        }
        
        // Images in section
        const sectionImages = await section.locator('.album-image, .memory-image').all();
        console.log(`  Contains ${sectionImages.length} images`);
        
        // Might have captions or dates
        const captions = section.locator('.image-caption, .memory-date');
        if (await captions.count() > 0) {
          console.log('  Has captions/dates');
        }
      }
    }
  });

  test('Export character gallery', async ({ page }) => {
    await page.goto('/gallery');
    
    // Filter by specific character first
    const characterFilter = page.locator('select[name="character"]');
    const options = await characterFilter.locator('option').all();
    
    if (options.length > 1) {
      await characterFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);
      
      // Look for export option
      const exportButton = page.locator('button:has-text("エクスポート"), button:has-text("Export")');
      
      if (await exportButton.count() > 0) {
        await exportButton.click();
        
        // Export options modal
        const exportModal = page.locator('.export-modal, [data-testid="export-modal"]');
        await expect(exportModal).toBeVisible();
        
        // Format options
        const formatOptions = {
          zip: exportModal.locator(':has-text("ZIP")'),
          pdf: exportModal.locator(':has-text("PDF")'),
          individualFiles: exportModal.locator(':has-text("個別"), :has-text("Individual")')
        };
        
        // Select ZIP if available
        if (await formatOptions.zip.count() > 0) {
          await formatOptions.zip.click();
          
          // Quality option
          const qualitySelect = exportModal.locator('select[name="quality"]');
          if (await qualitySelect.count() > 0) {
            await qualitySelect.selectOption('high');
          }
          
          // Include metadata option
          const metadataCheckbox = exportModal.locator('input[name="includeMetadata"]');
          if (await metadataCheckbox.count() > 0) {
            await metadataCheckbox.check();
          }
          
          // Start export
          const downloadPromise = page.waitForEvent('download');
          await exportModal.locator('button:has-text("ダウンロード"), button:has-text("Download")').click();
          
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toMatch(/\.zip$/);
          console.log(`Exported: ${download.suggestedFilename()}`);
        }
      }
    }
  });

  test('Character affinity milestone rewards', async ({ page }) => {
    await page.goto('/characters');
    
    // Find character close to milestone
    const characters = await page.locator('.character-card').all();
    
    for (const char of characters) {
      const affinityBadge = char.locator('.affinity-badge');
      if (await affinityBadge.count() > 0) {
        const levelText = await affinityBadge.textContent();
        const level = parseInt(levelText?.match(/\d+/)?.[0] || '0');
        
        // Check if at milestone
        if (level % 10 === 0 && level > 0) {
          await char.click();
          await page.waitForURL(/characters/);
          
          // Should show milestone reached
          const milestoneNotification = page.locator('.milestone-notification, :has-text("マイルストーン"), :has-text("Milestone")');
          
          if (await milestoneNotification.count() > 0) {
            await expect(milestoneNotification).toBeVisible();
            
            // Should mention image unlock
            await expect(milestoneNotification).toContainText(/画像|image/i);
            
            // Link to view new image
            const viewImageLink = milestoneNotification.locator('a, button');
            if (await viewImageLink.count() > 0) {
              await viewImageLink.click();
              
              // Should go to gallery with new image highlighted
              await page.waitForURL(/gallery/);
              
              const newImageHighlight = page.locator('.new-image, .highlighted, [data-new="true"]');
              if (await newImageHighlight.count() > 0) {
                await expect(newImageHighlight).toBeVisible();
              }
            }
          }
          
          break;
        }
      }
    }
  });
});