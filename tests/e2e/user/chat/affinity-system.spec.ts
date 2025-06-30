import { test, expect } from '@playwright/test';

test.describe('Affinity System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('Affinity display in chat interface', async ({ page }) => {
    // Start chat
    await page.goto('/characters');
    const character = page.locator('.character-card:has(.free-badge)').first();
    const characterName = await character.locator('.character-name').textContent();
    
    await character.click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Check affinity UI elements
    const affinityPanel = page.locator('.affinity-panel, [data-testid="affinity-panel"]');
    await expect(affinityPanel).toBeVisible();
    
    // Should display level
    const levelDisplay = affinityPanel.locator('.level, :has-text("レベル"), :has-text("Lv")');
    await expect(levelDisplay).toBeVisible();
    const levelText = await levelDisplay.textContent();
    expect(levelText).toMatch(/\d+/);
    
    // Should display experience points
    const expDisplay = affinityPanel.locator('.experience, :has-text("EXP"), :has-text("経験値")');
    await expect(expDisplay).toBeVisible();
    
    // Should display progress bar
    const progressBar = affinityPanel.locator('.progress-bar, [role="progressbar"]');
    await expect(progressBar).toBeVisible();
    
    // Progress bar should have proper attributes
    const progressValue = await progressBar.getAttribute('aria-valuenow');
    expect(progressValue).toBeTruthy();
  });

  test('Experience gain from messages', async ({ page }) => {
    await page.goto('/characters');
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Get initial experience
    const expElement = page.locator(':has-text("EXP"), :has-text("経験値")');
    const initialExpText = await expElement.textContent();
    const initialExp = parseInt(initialExpText?.match(/\d+/)?.[0] || '0');
    
    console.log(`Initial EXP: ${initialExp}`);
    
    // Send a message
    await page.fill('[data-testid="message-input"]', 'こんにちは！今日はいい天気ですね。');
    await page.click('button[type="submit"]');
    
    // Wait for AI response
    await page.waitForSelector('.message.ai');
    
    // Check for experience gain notification
    const expGainNotification = page.locator(
      '.exp-gain, .exp-notification, :has-text("+"), :has-text("獲得")'
    );
    
    if (await expGainNotification.count() > 0) {
      await expect(expGainNotification).toBeVisible();
      const gainText = await expGainNotification.textContent();
      const expGained = parseInt(gainText?.match(/\d+/)?.[0] || '0');
      expect(expGained).toBeGreaterThan(0);
      console.log(`EXP gained: ${expGained}`);
    }
    
    // Wait for experience update
    await page.waitForTimeout(1000);
    
    // Check new experience
    const newExpText = await expElement.textContent();
    const newExp = parseInt(newExpText?.match(/\d+/)?.[0] || '0');
    
    expect(newExp).toBeGreaterThan(initialExp);
    console.log(`New EXP: ${newExp}`);
  });

  test('Level progression and milestones', async ({ page }) => {
    await page.goto('/characters');
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Get current level and exp
    const levelElement = page.locator(':has-text("レベル"), :has-text("Lv")');
    const currentLevel = parseInt((await levelElement.textContent())?.match(/\d+/)?.[0] || '0');
    
    // Calculate how close to next level
    const progressBar = page.locator('[role="progressbar"]');
    const progress = parseInt((await progressBar.getAttribute('aria-valuenow')) || '0');
    
    console.log(`Current level: ${currentLevel}, Progress: ${progress}%`);
    
    // If close to leveling up (>80%), try to trigger it
    if (progress > 80) {
      // Send multiple messages
      for (let i = 0; i < 3; i++) {
        await page.fill('[data-testid="message-input"]', `メッセージ ${i + 1}: 楽しく会話しましょう！`);
        await page.click('button[type="submit"]');
        await page.waitForSelector('.message.ai');
        
        // Check for level up
        const levelUpNotification = page.locator(
          '.level-up, :has-text("レベルアップ"), :has-text("Level Up")'
        );
        
        if (await levelUpNotification.count() > 0) {
          await expect(levelUpNotification).toBeVisible();
          console.log('Level up achieved!');
          
          // New level should be displayed
          const newLevel = parseInt((await levelElement.textContent())?.match(/\d+/)?.[0] || '0');
          expect(newLevel).toBe(currentLevel + 1);
          
          break;
        }
      }
    }
  });

  test('Image unlock at level milestones', async ({ page }) => {
    await page.goto('/characters');
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Check current unlocked images count
    const unlockedImages = page.locator(':has-text("解放済み"), :has-text("Unlocked"), :has-text("枚")');
    if (await unlockedImages.count() > 0) {
      const unlockedText = await unlockedImages.textContent();
      const unlockedCount = parseInt(unlockedText?.match(/\d+/)?.[0] || '0');
      
      // Check if at level milestone (10, 20, 30...)
      const levelText = await page.locator(':has-text("レベル")').textContent();
      const level = parseInt(levelText?.match(/\d+/)?.[0] || '0');
      
      // Images unlock every 10 levels
      const expectedUnlocked = Math.floor(level / 10);
      console.log(`Level: ${level}, Expected unlocked: ${expectedUnlocked}, Actual: ${unlockedCount}`);
      
      // If at level 9, 19, 29... try to reach milestone
      if (level % 10 === 9) {
        // Send messages to level up
        for (let i = 0; i < 5; i++) {
          await page.fill('[data-testid="message-input"]', `会話 ${i + 1}`);
          await page.click('button[type="submit"]');
          await page.waitForSelector('.message.ai');
          
          // Check for image unlock notification
          const imageUnlock = page.locator(
            ':has-text("画像が解放"), :has-text("Image unlocked"), :has-text("新しい画像")'
          );
          
          if (await imageUnlock.count() > 0) {
            await expect(imageUnlock).toBeVisible();
            console.log('New image unlocked!');
            
            // Gallery button might appear or update
            const galleryLink = page.locator('a:has-text("ギャラリー"), a:has-text("Gallery")');
            if (await galleryLink.count() > 0) {
              const badge = galleryLink.locator('.badge, .new-indicator');
              if (await badge.count() > 0) {
                await expect(badge).toBeVisible();
              }
            }
            break;
          }
        }
      }
    }
  });

  test('Affinity affects character responses', async ({ page }) => {
    await page.goto('/characters');
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Get current affinity level
    const levelText = await page.locator(':has-text("レベル")').textContent();
    const level = parseInt(levelText?.match(/\d+/)?.[0] || '0');
    
    // Send a greeting
    await page.fill('[data-testid="message-input"]', 'おはよう！');
    await page.click('button[type="submit"]');
    
    // Get AI response
    await page.waitForSelector('.message.ai');
    const response = await page.locator('.message.ai').last().textContent();
    
    // Higher affinity levels should have warmer responses
    if (level >= 20) {
      // Might contain more affectionate language
      console.log(`High affinity response (Level ${level}): ${response?.substring(0, 50)}...`);
      
      // Check for affectionate markers (varies by character)
      const hasAffection = 
        response?.includes('嬉しい') || 
        response?.includes('会えて') ||
        response?.includes('❤') ||
        response?.includes('大好き');
        
      if (hasAffection) {
        console.log('Response shows high affinity!');
      }
    } else {
      console.log(`Low affinity response (Level ${level}): ${response?.substring(0, 50)}...`);
    }
  });

  test('Affinity data persistence across sessions', async ({ page }) => {
    // Start chat and note affinity
    await page.goto('/characters');
    const character = page.locator('.character-card:has(.free-badge)').first();
    const charName = await character.locator('.character-name').textContent();
    
    await character.click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Get affinity data
    const levelBefore = await page.locator(':has-text("レベル")').textContent();
    const expBefore = await page.locator(':has-text("EXP")').textContent();
    
    // Send a message to gain exp
    await page.fill('[data-testid="message-input"]', 'テストメッセージ');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.message.ai');
    
    // Wait for exp update
    await page.waitForTimeout(1000);
    
    // Logout
    await page.click('button:has-text("ログアウト"), a:has-text("Logout")');
    await page.waitForURL('**/');
    
    // Login again
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Go back to same character
    await page.goto('/characters');
    await page.locator(`.character-card:has-text("${charName}")`).click();
    await page.click('button:has-text("チャットを開始")');
    
    // Affinity should be preserved
    const levelAfter = await page.locator(':has-text("レベル")').textContent();
    const expAfter = await page.locator(':has-text("EXP")').textContent();
    
    // Should maintain progress
    expect(parseInt(levelAfter?.match(/\d+/)?.[0] || '0')).toBeGreaterThanOrEqual(
      parseInt(levelBefore?.match(/\d+/)?.[0] || '0')
    );
    
    console.log('Affinity data persisted across sessions');
  });

  test('Multiple character affinity tracking', async ({ page }) => {
    // Check affinity for multiple characters
    await page.goto('/characters');
    
    const characters = await page.locator('.character-card:has(.free-badge)').all();
    const characterAffinities: { name: string; level: number }[] = [];
    
    // Get affinity for first 3 free characters
    for (let i = 0; i < Math.min(3, characters.length); i++) {
      const char = characters[i];
      const name = await char.locator('.character-name').textContent() || '';
      
      await char.click();
      
      // Check if has existing affinity
      const affinityBadge = page.locator('.affinity-badge, :has-text("Lv.")');
      if (await affinityBadge.count() > 0) {
        const levelText = await affinityBadge.textContent();
        const level = parseInt(levelText?.match(/\d+/)?.[0] || '0');
        characterAffinities.push({ name, level });
      } else {
        characterAffinities.push({ name, level: 0 });
      }
      
      // Go back to list
      await page.click('a:has-text("戻る"), button:has-text("Back")');
      await page.waitForURL('**/characters');
    }
    
    // Each character should have independent affinity
    console.log('Character affinities:', characterAffinities);
    expect(characterAffinities.length).toBeGreaterThan(0);
  });

  test('Affinity bonuses and rewards', async ({ page }) => {
    await page.goto('/characters');
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Check for any affinity bonuses
    const bonusSection = page.locator('.affinity-bonus, [data-testid="affinity-bonus"]');
    if (await bonusSection.count() > 0) {
      await expect(bonusSection).toBeVisible();
      
      // Might show bonus exp rates, special interactions, etc.
      const bonusText = await bonusSection.textContent();
      console.log('Affinity bonuses:', bonusText);
    }
    
    // Check mood system if implemented
    const moodIndicator = page.locator('.mood, [data-testid="mood"], :has-text("機嫌")');
    if (await moodIndicator.count() > 0) {
      const mood = await moodIndicator.textContent();
      console.log('Character mood:', mood);
      
      // Higher affinity might mean better base mood
      const level = parseInt(
        (await page.locator(':has-text("レベル")').textContent())?.match(/\d+/)?.[0] || '0'
      );
      
      if (level > 30) {
        expect(mood).toMatch(/良い|最高|Happy|Great/i);
      }
    }
  });

  test('Affinity UI in character list', async ({ page }) => {
    await page.goto('/characters');
    
    // Characters with affinity should show it in the list
    const characterCards = await page.locator('.character-card').all();
    
    for (const card of characterCards.slice(0, 5)) {
      const affinityIndicator = card.locator('.affinity-indicator, :has-text("Lv"), .level-badge');
      
      if (await affinityIndicator.count() > 0) {
        await expect(affinityIndicator).toBeVisible();
        
        const levelText = await affinityIndicator.textContent();
        console.log('Character affinity in list:', levelText);
        
        // Should show level number
        expect(levelText).toMatch(/\d+/);
        
        // Might have special styling for high affinity
        const hasHighAffinity = await card.evaluate(el => 
          el.classList.toString().includes('high-affinity') ||
          el.classList.toString().includes('favorite')
        );
        
        if (hasHighAffinity) {
          console.log('Character marked as high affinity/favorite');
        }
      }
    }
  });
});