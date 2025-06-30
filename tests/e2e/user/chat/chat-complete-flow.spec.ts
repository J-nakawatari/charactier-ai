import { test, expect } from '@playwright/test';

test.describe('Chat and Affinity Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('Complete chat flow with free character', async ({ page }) => {
    // Step 1: Go to characters
    await page.goto('/characters');
    
    // Step 2: Find a free character
    const freeCharacter = page.locator('.character-card:has(.free-badge), .character-card:has-text("無料")').first();
    await expect(freeCharacter).toBeVisible();
    
    const characterName = await freeCharacter.locator('.character-name').textContent();
    console.log(`Starting chat with free character: ${characterName}`);
    
    // Step 3: Click character to view details
    await freeCharacter.click();
    await page.waitForURL(/characters\/[a-zA-Z0-9]+/);
    
    // Step 4: Start chat
    await page.click('button:has-text("チャットを開始"), button:has-text("Start Chat")');
    await page.waitForURL('**/chat');
    
    // Step 5: Verify chat interface loaded
    await expect(page.locator('.chat-interface, [data-testid="chat-interface"]')).toBeVisible();
    await expect(page.locator('.chat-header')).toContainText(characterName || '');
    
    // Step 6: Check initial affinity display
    const affinitySection = page.locator('.affinity-display, [data-testid="affinity-display"]');
    if (await affinitySection.count() > 0) {
      await expect(affinitySection).toBeVisible();
      
      // Should show level 0 or 1 for new chat
      const levelText = await affinitySection.locator(':has-text("レベル"), :has-text("Level")').textContent();
      expect(levelText).toMatch(/[0-1]/);
    }
    
    // Step 7: Check token balance before sending message
    const tokenBalanceBeforeStr = await page.locator('[data-testid="token-balance"], .token-balance').textContent();
    const tokenBalanceBefore = parseInt(tokenBalanceBeforeStr?.replace(/[^0-9]/g, '') || '0');
    console.log(`Token balance before chat: ${tokenBalanceBefore}`);
    
    // Step 8: Send a message
    const messageInput = page.locator('textarea[placeholder*="メッセージ"], input[placeholder*="Message"], [data-testid="message-input"]');
    await messageInput.fill('こんにちは！今日はどんな一日でしたか？');
    
    // Step 9: Send message
    await page.click('button[type="submit"], button:has-text("送信"), button:has-text("Send")');
    
    // Step 10: Wait for AI response
    await page.waitForSelector('.message.ai, .message.assistant, [data-testid="ai-message"]', { timeout: 30000 });
    
    // Step 11: Verify message was sent and received
    await expect(page.locator('.message.user, [data-testid="user-message"]').last()).toContainText('こんにちは');
    await expect(page.locator('.message.ai, [data-testid="ai-message"]').last()).toBeVisible();
    
    // Step 12: Check token consumption
    await page.waitForTimeout(1000); // Wait for token update
    const tokenBalanceAfterStr = await page.locator('[data-testid="token-balance"], .token-balance').textContent();
    const tokenBalanceAfter = parseInt(tokenBalanceAfterStr?.replace(/[^0-9]/g, '') || '0');
    console.log(`Token balance after chat: ${tokenBalanceAfter}`);
    
    // Should have consumed tokens (typically 50-200 per exchange)
    expect(tokenBalanceBefore - tokenBalanceAfter).toBeGreaterThan(0);
    expect(tokenBalanceBefore - tokenBalanceAfter).toBeLessThan(500); // Sanity check
    
    // Step 13: Check affinity increase notification
    const expNotification = page.locator('.exp-notification, :has-text("経験値"), :has-text("EXP"), :has-text("+")');
    if (await expNotification.count() > 0) {
      await expect(expNotification).toBeVisible();
      console.log('Experience gained notification shown');
    }
  });

  test('Chat with purchased character and affinity tracking', async ({ page }) => {
    // Navigate to purchased character
    await page.goto('/characters');
    
    // Find a purchased character or free character
    const character = page.locator('.character-card:has(.purchased-badge), .character-card:has(.free-badge)').first();
    await character.click();
    
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Get initial affinity
    let initialLevel = 0;
    let initialExp = 0;
    
    const affinityInfo = page.locator('.affinity-info, [data-testid="affinity-info"]');
    if (await affinityInfo.count() > 0) {
      const levelText = await affinityInfo.locator('.level, :has-text("レベル")').textContent();
      initialLevel = parseInt(levelText?.match(/\d+/)?.[0] || '0');
      
      const expText = await affinityInfo.locator('.exp, :has-text("経験値")').textContent();
      initialExp = parseInt(expText?.match(/\d+/)?.[0] || '0');
    }
    
    console.log(`Initial affinity - Level: ${initialLevel}, EXP: ${initialExp}`);
    
    // Send multiple messages to increase affinity
    for (let i = 0; i < 3; i++) {
      const messages = [
        'あなたの好きなことを教えてください。',
        '今日の天気はどうですか？',
        '一緒に楽しい時間を過ごしましょう！'
      ];
      
      await page.fill('[data-testid="message-input"], textarea', messages[i]);
      await page.click('button[type="submit"]');
      
      // Wait for response
      await page.waitForSelector(`.message.ai:nth-child(${(i + 1) * 2 + 1})`, { timeout: 30000 });
      
      // Small delay between messages
      await page.waitForTimeout(2000);
    }
    
    // Check affinity after multiple messages
    const newLevelText = await affinityInfo.locator('.level, :has-text("レベル")').textContent();
    const newLevel = parseInt(newLevelText?.match(/\d+/)?.[0] || '0');
    
    const newExpText = await affinityInfo.locator('.exp, :has-text("経験値")').textContent();
    const newExp = parseInt(newExpText?.match(/\d+/)?.[0] || '0');
    
    console.log(`New affinity - Level: ${newLevel}, EXP: ${newExp}`);
    
    // Should have gained experience
    expect(newExp).toBeGreaterThan(initialExp);
  });

  test('Level up and image unlock notification', async ({ page }) => {
    // This test simulates reaching a level milestone
    await page.goto('/characters');
    
    // Select a character with existing affinity
    const character = page.locator('.character-card').first();
    await character.click();
    
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Check current level
    const levelElement = page.locator('.level-display, :has-text("レベル")');
    const currentLevel = parseInt((await levelElement.textContent())?.match(/\d+/)?.[0] || '0');
    
    // If close to level milestone (10, 20, 30...), keep chatting
    if (currentLevel % 10 >= 8) {
      // Send messages until level up
      for (let i = 0; i < 5; i++) {
        await page.fill('[data-testid="message-input"]', `メッセージ ${i + 1}`);
        await page.click('button[type="submit"]');
        await page.waitForSelector('.message.ai', { state: 'attached' });
        
        // Check for level up notification
        const levelUpNotification = page.locator('.level-up-notification, :has-text("レベルアップ"), :has-text("Level Up")');
        if (await levelUpNotification.count() > 0) {
          await expect(levelUpNotification).toBeVisible();
          
          // Check for image unlock notification
          const imageUnlockNotification = page.locator(':has-text("画像がアンロック"), :has-text("Image unlocked")');
          if (await imageUnlockNotification.count() > 0) {
            await expect(imageUnlockNotification).toBeVisible();
            console.log('Image unlock notification displayed!');
          }
          break;
        }
      }
    }
  });

  test('Chat history persistence', async ({ page }) => {
    // Start a chat and send messages
    await page.goto('/characters');
    const character = page.locator('.character-card:has(.free-badge)').first();
    const charName = await character.locator('.character-name').textContent();
    
    await character.click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Send a unique message
    const uniqueMessage = `Test message ${Date.now()}`;
    await page.fill('[data-testid="message-input"]', uniqueMessage);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.message.ai');
    
    // Leave chat
    await page.click('a:has-text("戻る"), button:has-text("Exit")');
    
    // Go back to same character
    await page.goto('/characters');
    await page.locator(`.character-card:has-text("${charName}")`).click();
    await page.click('button:has-text("チャットを開始")');
    
    // Previous messages should be loaded
    await expect(page.locator(`.message.user:has-text("${uniqueMessage}")`)).toBeVisible();
  });

  test('Token insufficient warning', async ({ page }) => {
    // Navigate to dashboard to check token balance
    await page.goto('/dashboard');
    const balanceText = await page.locator('[data-testid="token-balance"]').textContent();
    const currentBalance = parseInt(balanceText?.replace(/[^0-9]/g, '') || '0');
    
    // If balance is low, test warning
    if (currentBalance < 1000) {
      await page.goto('/characters');
      await page.locator('.character-card:has(.free-badge)').first().click();
      await page.click('button:has-text("チャットを開始")');
      
      // Try to send message
      await page.fill('[data-testid="message-input"]', 'Test message');
      await page.click('button[type="submit"]');
      
      // Should show warning or redirect to purchase
      const warning = page.locator(':has-text("トークンが不足"), :has-text("Insufficient tokens")');
      const purchasePrompt = page.locator(':has-text("購入"), :has-text("Purchase")');
      
      await expect(warning.or(purchasePrompt)).toBeVisible();
    }
  });

  test('Character mood changes with affinity', async ({ page }) => {
    await page.goto('/characters');
    
    // Select character with high affinity if available
    const character = page.locator('.character-card').first();
    await character.click();
    await page.click('button:has-text("チャットを開始")');
    
    // Check mood indicator
    const moodIndicator = page.locator('.mood-indicator, [data-testid="mood"], :has-text("機嫌")');
    if (await moodIndicator.count() > 0) {
      await expect(moodIndicator).toBeVisible();
      
      // Mood should change based on interactions
      const initialMood = await moodIndicator.textContent();
      
      // Send positive message
      await page.fill('[data-testid="message-input"]', '今日も素敵ですね！会えて嬉しいです。');
      await page.click('button[type="submit"]');
      await page.waitForSelector('.message.ai');
      
      // Check if mood improved
      const newMood = await moodIndicator.textContent();
      console.log(`Mood change: ${initialMood} -> ${newMood}`);
    }
  });

  test('Message input validation', async ({ page }) => {
    await page.goto('/characters');
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    
    const messageInput = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('button[type="submit"]');
    
    // Empty message should not send
    await messageInput.fill('');
    await sendButton.click();
    
    // Should still be on same page, no new message
    const messageCount = await page.locator('.message').count();
    
    // Very long message handling
    const longMessage = 'あ'.repeat(1001); // Assuming 1000 char limit
    await messageInput.fill(longMessage);
    
    // Should show length warning or truncate
    const warning = page.locator(':has-text("文字数"), :has-text("too long")');
    if (await warning.count() > 0) {
      await expect(warning).toBeVisible();
    }
    
    // Check character counter if exists
    const charCounter = page.locator('.character-counter, [data-testid="char-count"]');
    if (await charCounter.count() > 0) {
      await expect(charCounter).toContainText('1000');
    }
  });

  test('Chat loading states', async ({ page }) => {
    await page.goto('/characters');
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    
    // Send message and check loading states
    await page.fill('[data-testid="message-input"]', 'Hello!');
    
    // Monitor loading indicator
    const loadingPromise = page.waitForSelector('.loading-indicator, .typing-indicator, [data-testid="loading"]', { state: 'visible' });
    await page.click('button[type="submit"]');
    
    // Should show loading while waiting for response
    await loadingPromise;
    await expect(page.locator('.loading-indicator, .typing-indicator')).toBeVisible();
    
    // Loading should disappear after response
    await page.waitForSelector('.message.ai');
    await expect(page.locator('.loading-indicator')).not.toBeVisible();
  });

  test('Chat error handling', async ({ page }) => {
    await page.goto('/characters');
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    
    // Simulate network error by going offline
    await page.context().setOffline(true);
    
    // Try to send message
    await page.fill('[data-testid="message-input"]', 'Test message');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator(':has-text("エラー"), :has-text("Error"), :has-text("失敗")')).toBeVisible({ timeout: 10000 });
    
    // Go back online
    await page.context().setOffline(false);
    
    // Retry should work
    const retryButton = page.locator('button:has-text("再試行"), button:has-text("Retry")');
    if (await retryButton.count() > 0) {
      await retryButton.click();
      await page.waitForSelector('.message.ai');
    }
  });
});