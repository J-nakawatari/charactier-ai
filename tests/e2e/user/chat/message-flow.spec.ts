import { test, expect } from '@playwright/test';

test.describe('Chat Message Flow', () => {
  let chatUrl: string;
  
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Start chat with free character
    await page.goto('/characters');
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    chatUrl = page.url();
  });

  test('Basic message send and receive', async ({ page }) => {
    // Type message
    const messageInput = page.locator('[data-testid="message-input"], textarea');
    const testMessage = 'Hello, nice to meet you!';
    await messageInput.fill(testMessage);
    
    // Check send button enabled
    const sendButton = page.locator('button[type="submit"], button:has-text("送信")');
    await expect(sendButton).toBeEnabled();
    
    // Send message
    await sendButton.click();
    
    // Verify user message appears
    const userMessage = page.locator('.message.user, [data-testid="user-message"]').last();
    await expect(userMessage).toContainText(testMessage);
    
    // Wait for AI response
    await page.waitForSelector('.message.ai, [data-testid="ai-message"]', { 
      state: 'visible',
      timeout: 30000 
    });
    
    // Verify AI message has content
    const aiMessage = page.locator('.message.ai').last();
    const aiText = await aiMessage.textContent();
    expect(aiText).toBeTruthy();
    expect(aiText!.length).toBeGreaterThan(10); // Should be substantial response
    
    // Input should be cleared
    await expect(messageInput).toHaveValue('');
  });

  test('Message timestamps', async ({ page }) => {
    // Send message
    await page.fill('[data-testid="message-input"]', 'Test timestamp');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.message.ai');
    
    // Check timestamps exist
    const timestamps = page.locator('.message-timestamp, .timestamp, [data-testid="timestamp"]');
    await expect(timestamps).toHaveCount(2); // User and AI message
    
    // Timestamps should be recent (within last minute)
    const firstTimestamp = await timestamps.first().textContent();
    expect(firstTimestamp).toMatch(/\d/); // Contains numbers
  });

  test('Real-time typing indicator', async ({ page }) => {
    // Send message
    await page.fill('[data-testid="message-input"]', 'Please tell me a story');
    
    // Watch for typing indicator
    const typingIndicatorPromise = page.waitForSelector(
      '.typing-indicator, .loading-dots, :has-text("入力中"), :has-text("typing")',
      { state: 'visible' }
    );
    
    await page.click('button[type="submit"]');
    
    // Should show typing indicator
    await typingIndicatorPromise;
    const typingIndicator = page.locator('.typing-indicator, .loading-dots');
    await expect(typingIndicator).toBeVisible();
    
    // Should disappear when message arrives
    await page.waitForSelector('.message.ai');
    await expect(typingIndicator).not.toBeVisible();
  });

  test('Token consumption display', async ({ page }) => {
    // Get initial token count
    const tokenDisplay = page.locator('[data-testid="token-balance"], .token-balance');
    const initialTokens = parseInt((await tokenDisplay.textContent())?.replace(/[^0-9]/g, '') || '0');
    
    // Send message
    await page.fill('[data-testid="message-input"]', 'こんにちは');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.message.ai');
    
    // Check token consumption notification
    const tokenUsedNotification = page.locator(
      '.token-used-notification, :has-text("トークン消費"), :has-text("tokens used")'
    );
    
    if (await tokenUsedNotification.count() > 0) {
      await expect(tokenUsedNotification).toBeVisible();
      
      // Should show number of tokens used
      const usedText = await tokenUsedNotification.textContent();
      const tokensUsed = parseInt(usedText?.match(/\d+/)?.[0] || '0');
      expect(tokensUsed).toBeGreaterThan(0);
      expect(tokensUsed).toBeLessThan(500); // Reasonable range
    }
    
    // Balance should decrease
    await page.waitForTimeout(1000);
    const newTokens = parseInt((await tokenDisplay.textContent())?.replace(/[^0-9]/g, '') || '0');
    expect(newTokens).toBeLessThan(initialTokens);
  });

  test('Message retry on failure', async ({ page }) => {
    // Send normal message first
    await page.fill('[data-testid="message-input"]', 'First message');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.message.ai');
    
    // Intercept next request to fail
    await page.route('**/api/v1/chat/**', route => {
      route.abort('failed');
    });
    
    // Send message that will fail
    await page.fill('[data-testid="message-input"]', 'This will fail');
    await page.click('button[type="submit"]');
    
    // Should show error state
    const errorMessage = page.locator('.message-error, .error-state, :has-text("失敗")');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    // Should have retry button
    const retryButton = page.locator('button:has-text("再試行"), button:has-text("Retry")');
    await expect(retryButton).toBeVisible();
    
    // Remove route intercept
    await page.unroute('**/api/v1/chat/**');
    
    // Click retry
    await retryButton.click();
    
    // Should successfully send
    await page.waitForSelector('.message.ai:last-child', { timeout: 30000 });
  });

  test('Message formatting and special characters', async ({ page }) => {
    const specialMessages = [
      'Message with emoji 😊🎉',
      'Message with\nmultiple\nlines',
      'Message with "quotes" and \'apostrophes\'',
      'URL test: https://example.com',
      'Email test: test@example.com'
    ];
    
    for (const message of specialMessages) {
      await page.fill('[data-testid="message-input"]', message);
      await page.click('button[type="submit"]');
      
      // Wait for response
      await page.waitForSelector('.message.ai', { state: 'attached' });
      
      // Verify message displayed correctly
      const userMessage = page.locator('.message.user').last();
      const displayedText = await userMessage.textContent();
      
      // Should preserve special characters
      if (message.includes('😊')) {
        expect(displayedText).toContain('😊');
      }
      
      // URLs might be linkified
      if (message.includes('https://')) {
        const link = userMessage.locator('a[href*="https://"]');
        if (await link.count() > 0) {
          await expect(link).toHaveAttribute('target', '_blank');
        }
      }
      
      await page.waitForTimeout(1000); // Rate limiting
    }
  });

  test('Long message handling', async ({ page }) => {
    // Create a long message
    const longMessage = 'これは長いメッセージのテストです。'.repeat(50);
    
    await page.fill('[data-testid="message-input"]', longMessage);
    
    // Check if character limit is shown
    const charCount = page.locator('.char-count, [data-testid="char-count"]');
    if (await charCount.count() > 0) {
      const countText = await charCount.textContent();
      expect(countText).toMatch(/\d+/);
    }
    
    // Try to send
    await page.click('button[type="submit"]');
    
    // If message is too long, should show error
    const lengthError = page.locator(':has-text("文字数制限"), :has-text("too long")');
    if (await lengthError.count() > 0) {
      await expect(lengthError).toBeVisible();
      
      // Reduce message length
      await page.fill('[data-testid="message-input"]', longMessage.substring(0, 500));
    }
    
    // Should be able to send
    await page.click('button[type="submit"]');
    await page.waitForSelector('.message.ai');
  });

  test('Message scroll behavior', async ({ page }) => {
    // Send multiple messages to fill the chat
    for (let i = 0; i < 5; i++) {
      await page.fill('[data-testid="message-input"]', `Message ${i + 1}`);
      await page.click('button[type="submit"]');
      await page.waitForSelector(`.message.ai:nth-of-type(${i + 1})`);
    }
    
    // Should auto-scroll to latest message
    const lastMessage = page.locator('.message').last();
    await expect(lastMessage).toBeInViewport();
    
    // Scroll up
    await page.evaluate(() => {
      const chatContainer = document.querySelector('.chat-messages, [data-testid="chat-container"]');
      if (chatContainer) chatContainer.scrollTop = 0;
    });
    
    // Send new message
    await page.fill('[data-testid="message-input"]', 'New message after scroll');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.message.ai');
    
    // Should auto-scroll to new message
    const newestMessage = page.locator('.message').last();
    await expect(newestMessage).toBeInViewport();
  });

  test('Message actions (copy, delete if available)', async ({ page }) => {
    // Send a message
    await page.fill('[data-testid="message-input"]', 'Test message for actions');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.message.ai');
    
    // Hover over AI message to see if actions appear
    const aiMessage = page.locator('.message.ai').last();
    await aiMessage.hover();
    
    // Check for copy button
    const copyButton = aiMessage.locator('button:has-text("コピー"), button:has-text("Copy")');
    if (await copyButton.count() > 0) {
      await copyButton.click();
      
      // Should show copied notification
      await expect(page.locator(':has-text("コピーしました"), :has-text("Copied")')).toBeVisible();
    }
    
    // Check for other actions
    const moreActions = aiMessage.locator('button[aria-label*="more"], button[aria-label*="menu"]');
    if (await moreActions.count() > 0) {
      await moreActions.click();
      
      // Might have regenerate, report, etc.
      const regenerateBtn = page.locator('button:has-text("再生成"), button:has-text("Regenerate")');
      if (await regenerateBtn.count() > 0) {
        console.log('Regenerate action available');
      }
    }
  });

  test('Inappropriate content filtering', async ({ page }) => {
    // Try to send inappropriate message
    const inappropriateMessage = 'This is a test for inappropriate content filter';
    
    await page.fill('[data-testid="message-input"]', inappropriateMessage);
    await page.click('button[type="submit"]');
    
    // Might show warning or filter the message
    const warning = page.locator(
      ':has-text("不適切"), :has-text("inappropriate"), :has-text("ガイドライン")'
    );
    
    if (await warning.count() > 0) {
      await expect(warning).toBeVisible();
      console.log('Content filter activated');
    } else {
      // Message sent, check if AI response mentions guidelines
      await page.waitForSelector('.message.ai');
      const aiResponse = await page.locator('.message.ai').last().textContent();
      
      if (aiResponse?.includes('ガイドライン') || aiResponse?.includes('appropriate')) {
        console.log('AI mentioned content guidelines');
      }
    }
  });
});