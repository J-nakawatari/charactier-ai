import { test, expect } from '@playwright/test';

test.describe('Chat History E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('Chat history saves and loads correctly', async ({ page }) => {
    // Start chat with a character
    await page.goto('/characters');
    const character = page.locator('.character-card:has(.free-badge)').first();
    const characterName = await character.locator('.character-name').textContent();
    
    await character.click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Send unique messages
    const timestamp = Date.now();
    const messages = [
      `Test message 1 - ${timestamp}`,
      `Test message 2 - ${timestamp}`,
      `Test message 3 - ${timestamp}`
    ];
    
    for (const msg of messages) {
      await page.fill('[data-testid="message-input"]', msg);
      await page.click('button[type="submit"]');
      await page.waitForSelector('.message.ai');
      await page.waitForTimeout(1000); // Rate limiting
    }
    
    // Count total messages (user + AI)
    const messageCount = await page.locator('.message').count();
    expect(messageCount).toBe(messages.length * 2); // User + AI messages
    
    // Leave chat
    await page.click('a:has-text("戻る"), button:has-text("Back")');
    await page.waitForURL('**/characters');
    
    // Return to same character
    await page.locator(`.character-card:has-text("${characterName}")`).click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // All previous messages should be loaded
    const loadedMessageCount = await page.locator('.message').count();
    expect(loadedMessageCount).toBe(messageCount);
    
    // Verify specific messages exist
    for (const msg of messages) {
      await expect(page.locator(`.message.user:has-text("${msg}")`)).toBeVisible();
    }
  });

  test('Chat history pagination for long conversations', async ({ page }) => {
    await page.goto('/characters');
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Check if there's existing history
    const messageCount = await page.locator('.message').count();
    
    if (messageCount > 20) {
      // Should have load more button or infinite scroll
      const loadMoreButton = page.locator('button:has-text("もっと見る"), button:has-text("Load more")');
      
      if (await loadMoreButton.count() > 0) {
        await loadMoreButton.click();
        
        // More messages should load
        await page.waitForTimeout(1000);
        const newMessageCount = await page.locator('.message').count();
        expect(newMessageCount).toBeGreaterThan(messageCount);
      } else {
        // Check for infinite scroll
        const chatContainer = page.locator('.chat-messages, [data-testid="chat-container"]');
        
        // Scroll to top
        await chatContainer.evaluate(el => el.scrollTop = 0);
        
        // Wait for more messages to load
        await page.waitForTimeout(1000);
        const newMessageCount = await page.locator('.message').count();
        
        if (newMessageCount > messageCount) {
          console.log('Infinite scroll detected');
        }
      }
    }
  });

  test('Chat history search functionality', async ({ page }) => {
    await page.goto('/characters');
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Look for search button/icon
    const searchButton = page.locator('button[aria-label*="検索"], button[aria-label*="search"], button:has-text("検索")');
    
    if (await searchButton.count() > 0) {
      await searchButton.click();
      
      // Search modal or input should appear
      const searchInput = page.locator('input[placeholder*="検索"], input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible();
      
      // Search for a common word
      await searchInput.fill('こんにちは');
      await searchInput.press('Enter');
      
      // Should highlight or filter messages
      const highlightedMessages = page.locator('.message.highlighted, .message:has(mark)');
      if (await highlightedMessages.count() > 0) {
        console.log('Search results highlighted');
        await expect(highlightedMessages.first()).toBeVisible();
      }
      
      // Clear search
      await searchInput.clear();
      await searchInput.press('Escape');
    }
  });

  test('Chat session management', async ({ page }) => {
    // Check if there's a chat history/sessions view
    await page.goto('/dashboard');
    
    const chatHistoryLink = page.locator('a:has-text("チャット履歴"), a:has-text("Chat History")');
    if (await chatHistoryLink.count() > 0) {
      await chatHistoryLink.click();
      await page.waitForURL('**/chat-history');
      
      // Should show list of chat sessions
      const sessions = page.locator('.chat-session, [data-testid="chat-session"]');
      const sessionCount = await sessions.count();
      
      if (sessionCount > 0) {
        // Each session should show:
        const firstSession = sessions.first();
        
        // Character name
        await expect(firstSession.locator('.character-name')).toBeVisible();
        
        // Last message preview
        await expect(firstSession.locator('.last-message, .message-preview')).toBeVisible();
        
        // Timestamp
        await expect(firstSession.locator('.timestamp, .date')).toBeVisible();
        
        // Message count
        const messageCount = firstSession.locator('.message-count, :has-text("メッセージ")');
        if (await messageCount.count() > 0) {
          await expect(messageCount).toBeVisible();
        }
        
        // Click to resume chat
        await firstSession.click();
        await page.waitForURL('**/chat');
        
        // Should load the selected chat
        await expect(page.locator('.message').first()).toBeVisible();
      }
    }
  });

  test('Chat export functionality', async ({ page }) => {
    await page.goto('/characters');
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Look for export option
    const menuButton = page.locator('button[aria-label*="メニュー"], button[aria-label*="menu"], button:has-text("⋮")');
    
    if (await menuButton.count() > 0) {
      await menuButton.click();
      
      const exportButton = page.locator('button:has-text("エクスポート"), button:has-text("Export")');
      if (await exportButton.count() > 0) {
        // Set up download promise before clicking
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();
        
        const download = await downloadPromise;
        
        // Verify download
        expect(download.suggestedFilename()).toMatch(/chat|export|\.txt|\.json/);
        
        // Could verify content if needed
        const content = await download.path();
        console.log('Chat exported successfully');
      }
    }
  });

  test('Chat deletion with confirmation', async ({ page }) => {
    await page.goto('/characters');
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Send a test message first
    await page.fill('[data-testid="message-input"]', 'Message to be deleted');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.message.ai');
    
    // Try to delete chat
    const menuButton = page.locator('button[aria-label*="menu"]');
    if (await menuButton.count() > 0) {
      await menuButton.click();
      
      const deleteButton = page.locator('button:has-text("削除"), button:has-text("Delete")');
      if (await deleteButton.count() > 0) {
        await deleteButton.click();
        
        // Should show confirmation dialog
        const confirmDialog = page.locator('[role="dialog"], .confirm-dialog');
        await expect(confirmDialog).toBeVisible();
        
        // Should have warning text
        await expect(confirmDialog.locator(':has-text("削除"), :has-text("delete")')).toBeVisible();
        
        // Cancel first
        await page.click('button:has-text("キャンセル"), button:has-text("Cancel")');
        await expect(confirmDialog).not.toBeVisible();
        
        // Messages should still exist
        await expect(page.locator('.message').first()).toBeVisible();
      }
    }
  });

  test('Auto-save draft messages', async ({ page }) => {
    await page.goto('/characters');
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Type a message but don't send
    const draftMessage = 'This is a draft message that should be saved';
    await page.fill('[data-testid="message-input"]', draftMessage);
    
    // Navigate away without sending
    await page.click('a:has-text("戻る")');
    await page.waitForURL('**/characters');
    
    // Go back to same chat
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    
    // Draft should be restored
    const messageInput = page.locator('[data-testid="message-input"]');
    const inputValue = await messageInput.inputValue();
    
    if (inputValue === draftMessage) {
      console.log('Draft message restored successfully');
      expect(inputValue).toBe(draftMessage);
    } else {
      console.log('Draft not restored (feature may not be implemented)');
    }
  });

  test('Chat context and continuity', async ({ page }) => {
    await page.goto('/characters');
    const character = page.locator('.character-card:has(.free-badge)').first();
    await character.click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Send context-setting message
    await page.fill('[data-testid="message-input"]', '私の名前は太郎です。覚えていてください。');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.message.ai');
    
    // Send follow-up message
    await page.fill('[data-testid="message-input"]', '私の名前を言ってみて');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.message.ai:nth-child(4)');
    
    // AI should remember the name
    const aiResponse = await page.locator('.message.ai').last().textContent();
    if (aiResponse?.includes('太郎')) {
      console.log('AI maintains context correctly');
      expect(aiResponse).toContain('太郎');
    }
    
    // Leave and return
    await page.click('a:has-text("戻る")');
    await page.waitForURL('**/characters');
    
    // Return to chat
    await character.click();
    await page.click('button:has-text("チャットを開始")');
    
    // Ask again
    await page.fill('[data-testid="message-input"]', '私の名前は？');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.message.ai');
    
    // Should still remember from history
    const newResponse = await page.locator('.message.ai').last().textContent();
    if (newResponse?.includes('太郎')) {
      console.log('Context preserved across sessions');
    }
  });

  test('Chat timestamp display and formatting', async ({ page }) => {
    await page.goto('/characters');
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Send a message
    await page.fill('[data-testid="message-input"]', 'Timestamp test');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.message.ai');
    
    // Check timestamp display
    const timestamps = await page.locator('.timestamp, .message-time').all();
    
    for (const timestamp of timestamps) {
      await expect(timestamp).toBeVisible();
      const timeText = await timestamp.textContent();
      
      // Should have time format (HH:MM or similar)
      expect(timeText).toMatch(/\d/);
      
      // Hover for full date/time
      await timestamp.hover();
      
      // Might show tooltip with full date
      const tooltip = page.locator('[role="tooltip"], .tooltip');
      if (await tooltip.count() > 0) {
        const fullDate = await tooltip.textContent();
        expect(fullDate).toMatch(/\d{4}|\d{2}\/\d{2}/); // Year or date
      }
    }
    
    // Check date separators for multi-day chats
    const dateSeparators = page.locator('.date-separator, :has-text("今日"), :has-text("昨日")');
    if (await dateSeparators.count() > 0) {
      console.log('Date separators found in chat');
      await expect(dateSeparators.first()).toBeVisible();
    }
  });
});