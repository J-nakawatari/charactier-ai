import { test, expect } from '@playwright/test';

test.describe('Real-time Notification Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('WebSocket/SSE connection for notifications', async ({ page }) => {
    let connectionEstablished = false;
    let notificationReceived = false;
    
    // Monitor WebSocket connections
    page.on('websocket', ws => {
      console.log('WebSocket URL:', ws.url());
      
      if (ws.url().includes('notifications') || ws.url().includes('ws')) {
        connectionEstablished = true;
        
        ws.on('framesent', event => {
          console.log('WS sent:', event.payload);
        });
        
        ws.on('framereceived', event => {
          console.log('WS received:', event.payload);
          if (event.payload.includes('notification')) {
            notificationReceived = true;
          }
        });
      }
    });
    
    // Monitor SSE connections
    page.on('response', response => {
      if (response.headers()['content-type']?.includes('text/event-stream')) {
        console.log('SSE endpoint:', response.url());
        connectionEstablished = true;
      }
    });
    
    // Wait for connection
    await page.waitForTimeout(3000);
    
    if (connectionEstablished) {
      console.log('Real-time connection established');
    }
    
    // Trigger notification-generating action
    await page.goto('/tokens/purchase');
    
    // Monitor for notification
    const notificationToast = page.locator('.notification-toast, .toast-notification, [role="alert"]');
    
    // Simulate purchase completion (would normally go through Stripe)
    // This is just to test if notifications appear
    await page.waitForTimeout(2000);
    
    if (await notificationToast.count() > 0) {
      console.log('Toast notification appeared');
      await expect(notificationToast).toBeVisible();
    }
  });

  test('Purchase completion notification', async ({ page }) => {
    // Start token purchase flow
    await page.goto('/tokens/purchase');
    
    // Select smallest pack
    await page.locator('.token-pack').first().click();
    
    // Monitor for notifications
    let purchaseNotificationReceived = false;
    
    page.on('response', response => {
      if (response.url().includes('notification') && response.status() === 200) {
        response.json().then(data => {
          if (data.type === 'purchase_complete') {
            purchaseNotificationReceived = true;
          }
        }).catch(() => {});
      }
    });
    
    // Click purchase (would redirect to Stripe)
    await page.click('button:has-text("購入する")');
    
    // In real test, would complete Stripe flow
    // For now, just check notification mechanisms are in place
    
    // Check for notification badge update
    const notificationBadge = page.locator('[data-testid="notification-icon"] .badge');
    const initialCount = await notificationBadge.count() > 0 ? 
      parseInt(await notificationBadge.textContent() || '0') : 0;
    
    console.log('Initial notification count:', initialCount);
  });

  test('Affinity milestone notifications', async ({ page }) => {
    // Go to chat with a character
    await page.goto('/characters');
    const character = page.locator('.character-card:has(.free-badge)').first();
    await character.click();
    await page.click('button:has-text("チャットを開始")');
    await page.waitForURL('**/chat');
    
    // Get current affinity level
    const levelElement = page.locator(':has-text("レベル"), :has-text("Lv")');
    const currentLevel = parseInt((await levelElement.textContent())?.match(/\d+/)?.[0] || '0');
    
    // If close to milestone
    if (currentLevel % 10 >= 8) {
      // Send messages to try to level up
      for (let i = 0; i < 5; i++) {
        await page.fill('[data-testid="message-input"]', `Message ${i + 1}`);
        await page.click('button[type="submit"]');
        await page.waitForSelector('.message.ai');
        
        // Check for milestone notification
        const milestoneNotification = page.locator(
          '.milestone-notification, ' +
          '.achievement-notification, ' +
          ':has-text("マイルストーン"), ' +
          ':has-text("画像がアンロック")'
        );
        
        if (await milestoneNotification.count() > 0) {
          await expect(milestoneNotification).toBeVisible();
          console.log('Milestone notification received!');
          
          // Should have special styling
          const hasAnimation = await milestoneNotification.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return styles.animation !== 'none' || styles.transition !== 'none';
          });
          
          if (hasAnimation) {
            console.log('Notification has animation effects');
          }
          
          // Should auto-dismiss after delay
          await expect(milestoneNotification).not.toBeVisible({ timeout: 10000 });
          break;
        }
      }
    }
  });

  test('Character message notifications', async ({ page }) => {
    // Check notification settings first
    await page.goto('/profile');
    await page.click('button:has-text("通知")');
    
    // Enable character message notifications
    const charMessageToggle = page.locator('input[name="characterMessages"]');
    if (await charMessageToggle.count() > 0) {
      await charMessageToggle.check();
      await page.click('button:has-text("保存")');
    }
    
    // Go to dashboard
    await page.goto('/dashboard');
    
    // Simulate character message notification
    // In real app, this might come from server push
    
    // Look for character message indicators
    const characterMessageBadge = page.locator('.character-message-badge, [data-testid="new-messages"]');
    
    if (await characterMessageBadge.count() > 0) {
      await expect(characterMessageBadge).toBeVisible();
      
      // Click to view
      await characterMessageBadge.click();
      
      // Should show character messages
      const messageModal = page.locator('.character-messages, [data-testid="character-messages"]');
      if (await messageModal.count() > 0) {
        await expect(messageModal).toBeVisible();
        
        // Should list characters with new messages
        const characterList = messageModal.locator('.character-with-message');
        const charCount = await characterList.count();
        console.log(`${charCount} characters have new messages`);
      }
    }
  });

  test('System announcement notifications', async ({ page }) => {
    // Open notification center
    await page.locator('[data-testid="notification-icon"]').click();
    const notificationPanel = page.locator('.notification-panel');
    
    // Look for system notifications
    const systemNotifications = notificationPanel.locator(
      '.notification-item:has-text("システム"), ' +
      '.notification-item:has-text("お知らせ"), ' +
      '.system-notification'
    );
    
    if (await systemNotifications.count() > 0) {
      const firstSystem = systemNotifications.first();
      
      // System notifications might have special styling
      const hasSystemStyle = await firstSystem.evaluate(el => 
        el.classList.toString().includes('system') ||
        window.getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)'
      );
      
      if (hasSystemStyle) {
        console.log('System notification has special styling');
      }
      
      // Click to read full announcement
      await firstSystem.click();
      
      // Might open modal or navigate
      const announcementModal = page.locator('.announcement-modal, [data-testid="announcement"]');
      if (await announcementModal.count() > 0) {
        await expect(announcementModal).toBeVisible();
        
        // Should have full content
        await expect(announcementModal.locator('.announcement-content')).toBeVisible();
        
        // Close button
        await announcementModal.locator('button:has-text("閉じる"), button:has-text("Close")').click();
        await expect(announcementModal).not.toBeVisible();
      }
    }
  });

  test('Notification delivery preferences', async ({ page }) => {
    await page.goto('/profile');
    await page.click('button:has-text("通知")');
    
    // Delivery method preferences
    const deliveryMethods = {
      inApp: page.locator('input[name="deliveryInApp"]'),
      email: page.locator('input[name="deliveryEmail"]'),
      browser: page.locator('input[name="deliveryBrowser"]'),
      mobile: page.locator('input[name="deliveryMobile"]')
    };
    
    // Configure delivery preferences
    for (const [method, toggle] of Object.entries(deliveryMethods)) {
      if (await toggle.count() > 0) {
        const isEnabled = await toggle.isChecked();
        console.log(`${method} delivery: ${isEnabled ? 'enabled' : 'disabled'}`);
        
        // Test toggling
        await toggle.click();
        const newState = await toggle.isChecked();
        expect(newState).toBe(!isEnabled);
      }
    }
    
    // Notification timing preferences
    const timingSection = page.locator('.notification-timing, [data-testid="notification-timing"]');
    
    if (await timingSection.count() > 0) {
      // Quiet hours
      const quietHoursToggle = timingSection.locator('input[name="quietHours"]');
      if (await quietHoursToggle.count() > 0) {
        await quietHoursToggle.check();
        
        // Time selectors should appear
        const startTime = timingSection.locator('input[name="quietStart"]');
        const endTime = timingSection.locator('input[name="quietEnd"]');
        
        if (await startTime.count() > 0) {
          await startTime.fill('22:00');
          await endTime.fill('07:00');
          console.log('Set quiet hours: 22:00 - 07:00');
        }
      }
      
      // Notification batching
      const batchingSelect = timingSection.locator('select[name="notificationBatching"]');
      if (await batchingSelect.count() > 0) {
        await batchingSelect.selectOption('hourly'); // immediate, hourly, daily
        console.log('Set notification batching to hourly');
      }
    }
    
    // Save all preferences
    await page.click('button:has-text("保存")');
    await expect(page.locator(':has-text("設定を保存")')).toBeVisible();
  });

  test('Notification action buttons', async ({ page }) => {
    // Trigger a notification that has actions
    // For this test, we'll check existing notifications
    
    await page.locator('[data-testid="notification-icon"]').click();
    const notificationPanel = page.locator('.notification-panel');
    
    // Find notification with actions
    const notificationWithActions = notificationPanel.locator('.notification-item').first();
    
    if (await notificationWithActions.count() > 0) {
      // Look for action buttons
      const actions = notificationWithActions.locator('.notification-actions, .action-buttons');
      
      if (await actions.count() > 0) {
        const actionButtons = actions.locator('button, a');
        const actionCount = await actionButtons.count();
        
        console.log(`Found ${actionCount} action buttons`);
        
        // Common actions
        const viewButton = actions.locator('button:has-text("表示"), button:has-text("View")');
        const dismissButton = actions.locator('button:has-text("閉じる"), button:has-text("Dismiss")');
        
        if (await viewButton.count() > 0) {
          // Test navigation
          const currentUrl = page.url();
          await viewButton.click();
          await page.waitForTimeout(1000);
          
          if (page.url() !== currentUrl) {
            console.log('Action button navigated to:', page.url());
            
            // Go back
            await page.goBack();
          }
        }
        
        if (await dismissButton.count() > 0) {
          await dismissButton.click();
          
          // Notification should be removed
          await expect(notificationWithActions).not.toBeVisible();
        }
      }
    }
  });

  test('Notification snooze functionality', async ({ page }) => {
    await page.locator('[data-testid="notification-icon"]').click();
    const notificationPanel = page.locator('.notification-panel');
    
    const notifications = notificationPanel.locator('.notification-item');
    
    if (await notifications.count() > 0) {
      const firstNotification = notifications.first();
      
      // Look for snooze option
      const moreMenu = firstNotification.locator('button[aria-label*="メニュー"], button:has-text("⋮")');
      
      if (await moreMenu.count() > 0) {
        await moreMenu.click();
        
        const snoozeOption = page.locator('button:has-text("スヌーズ"), button:has-text("Snooze")');
        
        if (await snoozeOption.count() > 0) {
          await snoozeOption.click();
          
          // Snooze duration options
          const snoozeModal = page.locator('.snooze-modal, [data-testid="snooze-options"]');
          if (await snoozeModal.count() > 0) {
            await expect(snoozeModal).toBeVisible();
            
            // Duration options
            const durations = {
              '1hour': snoozeModal.locator('button:has-text("1時間"), button:has-text("1 hour")'),
              '4hours': snoozeModal.locator('button:has-text("4時間"), button:has-text("4 hours")'),
              'tomorrow': snoozeModal.locator('button:has-text("明日"), button:has-text("Tomorrow")'),
              'nextWeek': snoozeModal.locator('button:has-text("来週"), button:has-text("Next week")')
            };
            
            // Select 1 hour
            if (await durations['1hour'].count() > 0) {
              await durations['1hour'].click();
              
              // Notification should be hidden
              await expect(firstNotification).not.toBeVisible();
              
              // Should show snooze confirmation
              await expect(page.locator(':has-text("スヌーズしました"), :has-text("Snoozed")')).toBeVisible();
            }
          }
        }
      }
    }
  });

  test('Notification categories and priorities', async ({ page }) => {
    await page.locator('[data-testid="notification-icon"]').click();
    const notificationPanel = page.locator('.notification-panel');
    
    const notifications = await notificationPanel.locator('.notification-item').all();
    
    // Analyze notification priorities
    const priorities = {
      high: 0,
      medium: 0,
      low: 0
    };
    
    for (const notification of notifications.slice(0, 5)) {
      // Check for priority indicators
      const hasHighPriority = await notification.evaluate(el => 
        el.classList.contains('high-priority') ||
        el.querySelector('.priority-high') !== null ||
        window.getComputedStyle(el).borderLeftColor === 'rgb(239, 68, 68)' // red
      );
      
      const hasLowPriority = await notification.evaluate(el => 
        el.classList.contains('low-priority') ||
        el.querySelector('.priority-low') !== null ||
        window.getComputedStyle(el).opacity === '0.7'
      );
      
      if (hasHighPriority) {
        priorities.high++;
      } else if (hasLowPriority) {
        priorities.low++;
      } else {
        priorities.medium++;
      }
      
      // Check category
      const categoryBadge = notification.locator('.category-badge, [data-category]');
      if (await categoryBadge.count() > 0) {
        const category = await categoryBadge.getAttribute('data-category') || 
                        await categoryBadge.textContent();
        console.log('Notification category:', category);
      }
    }
    
    console.log('Notification priorities:', priorities);
  });

  test('Do Not Disturb mode', async ({ page }) => {
    // Look for DND toggle in header or notification panel
    const dndToggle = page.locator('[data-testid="dnd-toggle"], button[aria-label*="通知オフ"]');
    
    if (await dndToggle.count() > 0) {
      // Enable DND
      await dndToggle.click();
      
      // Should show DND indicator
      await expect(page.locator('.dnd-indicator, :has-text("通知オフ"), :has-text("Do Not Disturb")')).toBeVisible();
      
      // Try to trigger a notification (e.g., by sending a chat message)
      await page.goto('/characters');
      const character = page.locator('.character-card:has(.free-badge)').first();
      if (await character.count() > 0) {
        await character.click();
        await page.click('button:has-text("チャットを開始")');
        
        // Send message
        await page.fill('[data-testid="message-input"]', 'Test DND');
        await page.click('button[type="submit"]');
        await page.waitForSelector('.message.ai');
        
        // Should NOT show notification toast
        const toast = page.locator('.notification-toast');
        await expect(toast).not.toBeVisible({ timeout: 3000 });
        
        // But notification should still be in notification center
        await page.locator('[data-testid="notification-icon"]').click();
        const notifications = page.locator('.notification-item');
        expect(await notifications.count()).toBeGreaterThan(0);
      }
      
      // Disable DND
      await dndToggle.click();
      await expect(page.locator('.dnd-indicator')).not.toBeVisible();
    }
  });
});