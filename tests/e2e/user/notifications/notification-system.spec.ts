import { test, expect } from '@playwright/test';

test.describe('Notification System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('Notification center access and UI', async ({ page }) => {
    // Look for notification bell/icon
    const notificationIcon = page.locator('[data-testid="notification-icon"], .notification-bell, button[aria-label*="通知"]');
    await expect(notificationIcon).toBeVisible();
    
    // Check for unread count badge
    const unreadBadge = notificationIcon.locator('.badge, .unread-count');
    if (await unreadBadge.count() > 0) {
      const unreadCount = await unreadBadge.textContent();
      console.log(`Unread notifications: ${unreadCount}`);
      expect(parseInt(unreadCount || '0')).toBeGreaterThanOrEqual(0);
    }
    
    // Click to open notification center
    await notificationIcon.click();
    
    // Notification dropdown/panel should appear
    const notificationPanel = page.locator('.notification-panel, [data-testid="notification-panel"], [role="menu"]');
    await expect(notificationPanel).toBeVisible();
    
    // Should have header
    await expect(notificationPanel.locator(':has-text("通知"), :has-text("Notifications")')).toBeVisible();
    
    // Check for different sections
    const sections = {
      unread: notificationPanel.locator(':has-text("未読"), :has-text("Unread")'),
      all: notificationPanel.locator(':has-text("すべて"), :has-text("All")'),
      markAllRead: notificationPanel.locator('button:has-text("すべて既読"), button:has-text("Mark all read")')
    };
    
    for (const [name, locator] of Object.entries(sections)) {
      if (await locator.count() > 0) {
        console.log(`Found ${name} section/button`);
      }
    }
  });

  test('Different notification types display', async ({ page }) => {
    // Open notification center
    const notificationIcon = page.locator('[data-testid="notification-icon"]');
    await notificationIcon.click();
    
    const notificationPanel = page.locator('.notification-panel');
    await expect(notificationPanel).toBeVisible();
    
    // Get all notifications
    const notifications = notificationPanel.locator('.notification-item, [data-testid="notification-item"]');
    const notificationCount = await notifications.count();
    
    console.log(`Found ${notificationCount} notifications`);
    
    if (notificationCount > 0) {
      // Check different notification types
      const notificationTypes = {
        purchase: { icon: '💳', keywords: ['購入', 'purchase', 'トークン'] },
        affinity: { icon: '❤️', keywords: ['親密度', 'レベル', 'affinity'] },
        achievement: { icon: '🏆', keywords: ['実績', 'achievement', '達成'] },
        system: { icon: '📢', keywords: ['システム', 'system', 'お知らせ'] },
        character: { icon: '👤', keywords: ['キャラクター', 'character', '新'] }
      };
      
      // Analyze first few notifications
      for (let i = 0; i < Math.min(3, notificationCount); i++) {
        const notification = notifications.nth(i);
        const text = await notification.textContent();
        
        // Identify type
        let notificationType = 'unknown';
        for (const [type, config] of Object.entries(notificationTypes)) {
          if (config.keywords.some(keyword => text?.includes(keyword))) {
            notificationType = type;
            break;
          }
        }
        
        console.log(`Notification ${i + 1}: Type=${notificationType}`);
        
        // Check elements
        await expect(notification.locator('.notification-title, .title')).toBeVisible();
        await expect(notification.locator('.notification-time, .timestamp')).toBeVisible();
        
        // Unread indicator
        const isUnread = await notification.evaluate(el => 
          el.classList.contains('unread') || 
          el.getAttribute('data-read') === 'false'
        );
        
        if (isUnread) {
          console.log(`  - Unread notification`);
        }
      }
    }
  });

  test('Real-time notification reception', async ({ page }) => {
    // This test would require WebSocket or SSE monitoring
    // Set up listener for new notifications
    
    // Monitor for notification events
    page.on('websocket', ws => {
      console.log('WebSocket connection detected:', ws.url());
      
      ws.on('framereceived', event => {
        if (event.payload.includes('notification')) {
          console.log('Notification event received');
        }
      });
    });
    
    // Or monitor for SSE
    page.on('response', response => {
      if (response.url().includes('/notifications/stream') || 
          response.headers()['content-type']?.includes('event-stream')) {
        console.log('SSE notification stream detected');
      }
    });
    
    // Trigger an action that generates a notification
    // For example, send a chat message to trigger token usage notification
    await page.goto('/characters');
    const freeCharacter = page.locator('.character-card:has(.free-badge)').first();
    if (await freeCharacter.count() > 0) {
      await freeCharacter.click();
      await page.click('button:has-text("チャットを開始")');
      await page.waitForURL('**/chat');
      
      // Send message
      await page.fill('[data-testid="message-input"]', 'Test notification');
      await page.click('button[type="submit"]');
      
      // Wait for potential notification
      await page.waitForTimeout(3000);
      
      // Check if notification appeared
      const notificationToast = page.locator('.notification-toast, .toast, [role="alert"]');
      if (await notificationToast.count() > 0) {
        await expect(notificationToast).toBeVisible();
        console.log('Real-time notification appeared');
        
        // Should auto-dismiss or have close button
        const closeButton = notificationToast.locator('button[aria-label*="閉じる"], button:has-text("×")');
        if (await closeButton.count() > 0) {
          await closeButton.click();
        } else {
          // Wait for auto-dismiss
          await expect(notificationToast).not.toBeVisible({ timeout: 10000 });
        }
      }
    }
  });

  test('Notification actions and navigation', async ({ page }) => {
    // Open notification center
    await page.locator('[data-testid="notification-icon"]').click();
    const notificationPanel = page.locator('.notification-panel');
    
    const notifications = notificationPanel.locator('.notification-item');
    if (await notifications.count() > 0) {
      const firstNotification = notifications.first();
      
      // Check for action buttons
      const actionButton = firstNotification.locator('button:has-text("見る"), button:has-text("View"), a');
      
      if (await actionButton.count() > 0) {
        // Store current URL
        const currentUrl = page.url();
        
        // Click action
        await actionButton.click();
        
        // Should navigate to relevant page
        await page.waitForTimeout(1000);
        const newUrl = page.url();
        
        if (newUrl !== currentUrl) {
          console.log('Notification navigated to:', newUrl);
          
          // Verify navigation based on notification type
          if (newUrl.includes('chat')) {
            await expect(page.locator('.chat-interface')).toBeVisible();
          } else if (newUrl.includes('gallery')) {
            await expect(page.locator('.gallery-container')).toBeVisible();
          } else if (newUrl.includes('purchase')) {
            await expect(page.locator('.purchase-history, .token-packs')).toBeVisible();
          }
        }
      }
    }
  });

  test('Mark notifications as read', async ({ page }) => {
    // Open notification center
    await page.locator('[data-testid="notification-icon"]').click();
    const notificationPanel = page.locator('.notification-panel');
    
    // Find unread notifications
    const unreadNotifications = notificationPanel.locator('.notification-item.unread, [data-read="false"]');
    const unreadCount = await unreadNotifications.count();
    
    if (unreadCount > 0) {
      console.log(`Found ${unreadCount} unread notifications`);
      
      // Mark individual notification as read
      const firstUnread = unreadNotifications.first();
      
      // Click on notification (might mark as read)
      await firstUnread.click();
      await page.waitForTimeout(500);
      
      // Check if marked as read
      const isStillUnread = await firstUnread.evaluate(el => 
        el.classList.contains('unread') || 
        el.getAttribute('data-read') === 'false'
      );
      
      if (!isStillUnread) {
        console.log('Notification marked as read on click');
      } else {
        // Look for explicit mark as read button
        const markReadButton = firstUnread.locator('button[aria-label*="既読"], button:has-text("既読")');
        if (await markReadButton.count() > 0) {
          await markReadButton.click();
          await page.waitForTimeout(500);
        }
      }
      
      // Mark all as read
      const markAllButton = notificationPanel.locator('button:has-text("すべて既読"), button:has-text("Mark all")');
      if (await markAllButton.count() > 0) {
        await markAllButton.click();
        
        // All notifications should be marked as read
        await page.waitForTimeout(1000);
        const remainingUnread = await notificationPanel.locator('.notification-item.unread').count();
        expect(remainingUnread).toBe(0);
        
        // Badge should disappear or show 0
        const badge = page.locator('[data-testid="notification-icon"] .badge');
        if (await badge.count() > 0) {
          const badgeText = await badge.textContent();
          expect(badgeText).toBe('0');
        }
      }
    }
  });

  test('Notification filtering and search', async ({ page }) => {
    // Open notification center
    await page.locator('[data-testid="notification-icon"]').click();
    const notificationPanel = page.locator('.notification-panel');
    
    // Check for filter options
    const filterTabs = notificationPanel.locator('.notification-tabs, [role="tablist"]');
    
    if (await filterTabs.count() > 0) {
      const tabs = {
        all: filterTabs.locator('button:has-text("すべて"), button:has-text("All")'),
        unread: filterTabs.locator('button:has-text("未読"), button:has-text("Unread")'),
        mentions: filterTabs.locator('button:has-text("メンション"), button:has-text("Mentions")'),
        system: filterTabs.locator('button:has-text("システム"), button:has-text("System")')
      };
      
      // Test each filter
      for (const [name, tab] of Object.entries(tabs)) {
        if (await tab.count() > 0) {
          await tab.click();
          await page.waitForTimeout(500);
          
          const filteredNotifications = notificationPanel.locator('.notification-item');
          const count = await filteredNotifications.count();
          console.log(`${name} filter: ${count} notifications`);
        }
      }
    }
    
    // Search functionality
    const searchInput = notificationPanel.locator('input[placeholder*="検索"], input[placeholder*="Search"]');
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('トークン');
      await page.waitForTimeout(500);
      
      const searchResults = notificationPanel.locator('.notification-item');
      const resultCount = await searchResults.count();
      
      if (resultCount > 0) {
        // All results should contain search term
        for (let i = 0; i < resultCount; i++) {
          const text = await searchResults.nth(i).textContent();
          expect(text?.toLowerCase()).toContain('トークン');
        }
      }
      
      // Clear search
      await searchInput.clear();
    }
  });

  test('Notification settings access from notification center', async ({ page }) => {
    // Open notification center
    await page.locator('[data-testid="notification-icon"]').click();
    const notificationPanel = page.locator('.notification-panel');
    
    // Look for settings link
    const settingsLink = notificationPanel.locator('a:has-text("設定"), a:has-text("Settings"), button[aria-label*="設定"]');
    
    if (await settingsLink.count() > 0) {
      await settingsLink.click();
      
      // Should navigate to notification settings
      await page.waitForURL(/settings|notifications/);
      
      // Verify on settings page
      await expect(page.locator('h1:has-text("通知設定"), h1:has-text("Notification")')).toBeVisible();
    }
  });

  test('Notification persistence across sessions', async ({ page }) => {
    // Get current notification state
    const notificationIcon = page.locator('[data-testid="notification-icon"]');
    const initialBadge = notificationIcon.locator('.badge');
    let initialCount = 0;
    
    if (await initialBadge.count() > 0) {
      initialCount = parseInt(await initialBadge.textContent() || '0');
    }
    
    console.log(`Initial notification count: ${initialCount}`);
    
    // Logout
    await page.click('button:has-text("ログアウト"), a:has-text("Logout")');
    await page.waitForURL('**/');
    
    // Login again
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Check notification count
    const newBadge = page.locator('[data-testid="notification-icon"] .badge');
    if (await newBadge.count() > 0) {
      const newCount = parseInt(await newBadge.textContent() || '0');
      console.log(`Notification count after re-login: ${newCount}`);
      
      // Should persist or increase (new notifications might arrive)
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    }
  });

  test('Desktop browser notifications permission', async ({ page, context }) => {
    // Check if browser notifications are supported
    const notificationPermission = await page.evaluate(() => {
      return 'Notification' in window ? Notification.permission : 'not-supported';
    });
    
    console.log('Browser notification permission:', notificationPermission);
    
    if (notificationPermission === 'default') {
      // Look for notification permission prompt
      const enableNotificationsButton = page.locator('button:has-text("通知を有効"), button:has-text("Enable notifications")');
      
      if (await enableNotificationsButton.count() > 0) {
        // Set up permission handler
        await context.grantPermissions(['notifications']);
        
        await enableNotificationsButton.click();
        
        // Should show success message
        await expect(page.locator(':has-text("通知を有効にしました"), :has-text("Notifications enabled")')).toBeVisible();
      }
    }
  });

  test('Notification sound settings', async ({ page }) => {
    // Go to notification settings
    await page.goto('/profile');
    const notificationTab = page.locator('button:has-text("通知")');
    if (await notificationTab.count() > 0) {
      await notificationTab.click();
    }
    
    // Sound settings
    const soundToggle = page.locator('input[name="notificationSound"], [data-testid="sound-toggle"]');
    
    if (await soundToggle.count() > 0) {
      const isEnabled = await soundToggle.isChecked();
      
      // Toggle sound
      await soundToggle.click();
      
      // Test sound button might appear
      const testSoundButton = page.locator('button:has-text("テスト"), button:has-text("Test sound")');
      if (await testSoundButton.count() > 0) {
        // Listen for audio play
        const audioPlayed = await page.evaluate(() => {
          return new Promise(resolve => {
            const originalPlay = HTMLAudioElement.prototype.play;
            HTMLAudioElement.prototype.play = function() {
              resolve(true);
              return originalPlay.apply(this, arguments);
            };
            
            // Timeout after 3 seconds
            setTimeout(() => resolve(false), 3000);
          });
        });
        
        await testSoundButton.click();
        
        if (audioPlayed) {
          console.log('Notification sound played');
        }
      }
      
      // Sound volume control
      const volumeSlider = page.locator('input[type="range"][name*="volume"]');
      if (await volumeSlider.count() > 0) {
        await volumeSlider.fill('50');
        console.log('Set notification volume to 50%');
      }
    }
  });

  test('Notification grouping and batching', async ({ page }) => {
    // Open notification center
    await page.locator('[data-testid="notification-icon"]').click();
    const notificationPanel = page.locator('.notification-panel');
    
    // Look for grouped notifications
    const groupedNotifications = notificationPanel.locator('.notification-group, [data-grouped="true"]');
    
    if (await groupedNotifications.count() > 0) {
      const firstGroup = groupedNotifications.first();
      
      // Should show count of grouped items
      const groupCount = firstGroup.locator('.group-count, :has-text("件")');
      if (await groupCount.count() > 0) {
        const count = await groupCount.textContent();
        console.log('Grouped notifications:', count);
      }
      
      // Expand group
      const expandButton = firstGroup.locator('button[aria-label*="展開"], button:has-text("もっと見る")');
      if (await expandButton.count() > 0) {
        await expandButton.click();
        
        // Should show individual notifications
        await expect(firstGroup.locator('.grouped-item, .sub-notification')).toHaveCount(parseInt(count?.match(/\d+/)?.[0] || '2'));
      }
    }
  });
});