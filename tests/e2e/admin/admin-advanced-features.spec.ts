import { test, expect } from '@playwright/test';

test.describe('Admin Advanced Features', () => {
  test.beforeEach(async ({ page }) => {
    // Admin login
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'AdminPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/dashboard');
  });

  test('Batch user operations', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Select multiple users
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    
    // Select first 3 users
    for (let i = 0; i < Math.min(3, checkboxCount); i++) {
      await checkboxes.nth(i).check();
    }
    
    // Batch actions menu should appear
    const batchActions = page.locator('.batch-actions, [data-testid="batch-actions"]');
    await expect(batchActions).toBeVisible();
    
    // Send notification to selected users
    const notifyButton = batchActions.locator('button:has-text("通知送信")');
    if (await notifyButton.count() > 0) {
      await notifyButton.click();
      
      // Notification compose modal
      const notifyModal = page.locator('.notify-modal, [role="dialog"]');
      await expect(notifyModal).toBeVisible();
      
      // Notification type
      await notifyModal.locator('select[name="notificationType"]').selectOption('announcement');
      
      // Title and message
      await notifyModal.locator('input[name="title"]').fill('システムメンテナンスのお知らせ');
      await notifyModal.locator('textarea[name="message"]').fill(
        '本日深夜2時より30分間、システムメンテナンスを実施します。'
      );
      
      // Priority
      await notifyModal.locator('select[name="priority"]').selectOption('high');
      
      // Preview
      const previewButton = notifyModal.locator('button:has-text("プレビュー")');
      if (await previewButton.count() > 0) {
        await previewButton.click();
        
        // Preview section should show
        await expect(notifyModal.locator('.notification-preview')).toBeVisible();
      }
      
      // Cancel (don't actually send)
      await notifyModal.locator('button:has-text("キャンセル")').click();
    }
    
    // Export selected users
    const exportButton = batchActions.locator('button:has-text("エクスポート")');
    if (await exportButton.count() > 0) {
      await exportButton.click();
      
      // Export options
      const exportModal = page.locator('.export-modal');
      await expect(exportModal).toBeVisible();
      
      // Select fields to export
      const fields = ['email', 'username', 'createdAt', 'tokenBalance', 'lastLogin'];
      for (const field of fields) {
        const checkbox = exportModal.locator(`input[name="export_${field}"]`);
        if (await checkbox.count() > 0) {
          await checkbox.check();
        }
      }
      
      // Format selection
      await exportModal.locator('input[value="csv"]').check();
      
      // Cancel export
      await exportModal.locator('button:has-text("キャンセル")').click();
    }
  });

  test('Advanced character analytics', async ({ page }) => {
    await page.goto('/admin/characters');
    
    // Navigate to analytics view
    const analyticsTab = page.locator('button:has-text("分析"), a:has-text("Analytics")');
    if (await analyticsTab.count() > 0) {
      await analyticsTab.click();
      
      // Character performance metrics
      const metrics = page.locator('.character-metrics, [data-testid="character-analytics"]');
      await expect(metrics).toBeVisible();
      
      // Metrics cards
      const metricCards = {
        avgChatLength: metrics.locator('.metric-card:has-text("平均チャット長")'),
        userRetention: metrics.locator('.metric-card:has-text("リテンション率")'),
        avgAffinity: metrics.locator('.metric-card:has-text("平均親密度")'),
        revenue: metrics.locator('.metric-card:has-text("収益")')
      };
      
      for (const [metric, locator] of Object.entries(metricCards)) {
        if (await locator.count() > 0) {
          const value = await locator.locator('.metric-value').textContent();
          console.log(`${metric}: ${value}`);
        }
      }
      
      // Character ranking table
      const rankingTable = page.locator('.character-ranking, [data-testid="character-ranking"]');
      if (await rankingTable.count() > 0) {
        await expect(rankingTable).toBeVisible();
        
        // Sort by different metrics
        const sortOptions = ['popularity', 'revenue', 'satisfaction', 'chats'];
        for (const option of sortOptions) {
          const sortButton = rankingTable.locator(`th[data-sort="${option}"]`);
          if (await sortButton.count() > 0) {
            await sortButton.click();
            await page.waitForTimeout(500); // Wait for sort
            
            // Check if sorted (arrow indicator)
            await expect(sortButton.locator('.sort-arrow, .sorted')).toBeVisible();
          }
        }
      }
    }
  });

  test('AI model performance monitoring', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.click('button:has-text("AI設定")');
    
    // Model usage statistics
    const modelStats = page.locator('.model-stats, [data-testid="model-usage"]');
    if (await modelStats.count() > 0) {
      await expect(modelStats).toBeVisible();
      
      // Usage by model
      const models = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-mini'];
      for (const model of models) {
        const modelRow = modelStats.locator(`tr:has-text("${model}")`);
        if (await modelRow.count() > 0) {
          const usage = await modelRow.locator('td:nth-child(2)').textContent(); // Requests
          const cost = await modelRow.locator('td:nth-child(3)').textContent(); // Cost
          const avgLatency = await modelRow.locator('td:nth-child(4)').textContent(); // Latency
          
          console.log(`${model}: ${usage} requests, ${cost} cost, ${avgLatency} latency`);
        }
      }
      
      // Cost optimization suggestions
      const suggestions = page.locator('.cost-suggestions, [data-testid="ai-suggestions"]');
      if (await suggestions.count() > 0) {
        const suggestionItems = suggestions.locator('.suggestion-item');
        const suggestionCount = await suggestionItems.count();
        console.log(`Found ${suggestionCount} cost optimization suggestions`);
      }
    }
    
    // Prompt template management
    const promptTemplates = page.locator('.prompt-templates, [data-testid="prompt-templates"]');
    if (await promptTemplates.count() > 0) {
      const addTemplateButton = promptTemplates.locator('button:has-text("テンプレート追加")');
      if (await addTemplateButton.count() > 0) {
        await addTemplateButton.click();
        
        // Template editor
        const templateModal = page.locator('.template-modal');
        await expect(templateModal).toBeVisible();
        
        // Template fields
        await templateModal.locator('input[name="templateName"]').fill('Friendly Assistant');
        await templateModal.locator('select[name="category"]').selectOption('personality');
        await templateModal.locator('textarea[name="template"]').fill(
          'You are a friendly and helpful assistant. Always be polite and supportive.'
        );
        
        // Variables
        const addVariableButton = templateModal.locator('button:has-text("変数追加")');
        if (await addVariableButton.count() > 0) {
          await addVariableButton.click();
          await templateModal.locator('input[name="variable_0_name"]').fill('userName');
          await templateModal.locator('input[name="variable_0_default"]').fill('ユーザー');
        }
        
        // Cancel
        await templateModal.locator('button:has-text("キャンセル")').click();
      }
    }
  });

  test('Revenue forecasting and insights', async ({ page }) => {
    await page.goto('/admin/revenue');
    
    // Forecasting section
    const forecastTab = page.locator('button:has-text("予測"), a:has-text("Forecast")');
    if (await forecastTab.count() > 0) {
      await forecastTab.click();
      
      // Forecast dashboard
      const forecastDashboard = page.locator('.forecast-dashboard, [data-testid="forecast"]');
      await expect(forecastDashboard).toBeVisible();
      
      // Forecast period
      await forecastDashboard.locator('select[name="forecastPeriod"]').selectOption('3months');
      
      // Forecast metrics
      const forecastMetrics = {
        projectedRevenue: forecastDashboard.locator('.metric:has-text("予測売上")'),
        growthRate: forecastDashboard.locator('.metric:has-text("成長率")'),
        confidence: forecastDashboard.locator('.metric:has-text("信頼度")')
      };
      
      for (const [metric, locator] of Object.entries(forecastMetrics)) {
        if (await locator.count() > 0) {
          const value = await locator.textContent();
          console.log(`${metric}: ${value}`);
        }
      }
      
      // Key drivers
      const driversSection = forecastDashboard.locator('.key-drivers, [data-testid="revenue-drivers"]');
      if (await driversSection.count() > 0) {
        const drivers = await driversSection.locator('.driver-item').all();
        for (const driver of drivers) {
          const name = await driver.locator('.driver-name').textContent();
          const impact = await driver.locator('.driver-impact').textContent();
          console.log(`Revenue driver: ${name} - ${impact}`);
        }
      }
    }
    
    // Insights and recommendations
    const insightsSection = page.locator('.revenue-insights, [data-testid="insights"]');
    if (await insightsSection.count() > 0) {
      const insights = await insightsSection.locator('.insight-card').all();
      console.log(`Found ${insights.length} revenue insights`);
      
      if (insights.length > 0) {
        // Check first insight
        const firstInsight = insights[0];
        const insightType = await firstInsight.locator('.insight-type').textContent();
        const insightMessage = await firstInsight.locator('.insight-message').textContent();
        console.log(`Insight: ${insightType} - ${insightMessage}`);
        
        // Action button
        const actionButton = firstInsight.locator('button:has-text("対応"), button:has-text("Action")');
        if (await actionButton.count() > 0) {
          console.log('Insight has actionable recommendation');
        }
      }
    }
  });

  test('Security monitoring and alerts', async ({ page }) => {
    await page.goto('/admin/security');
    
    // Security dashboard
    await expect(page.locator('h1:has-text("セキュリティ"), h1:has-text("Security")')).toBeVisible();
    
    // Active threats
    const threatIndicator = page.locator('.threat-indicator, [data-testid="threat-level"]');
    if (await threatIndicator.count() > 0) {
      const threatLevel = await threatIndicator.textContent();
      console.log('Current threat level:', threatLevel);
      
      // Color coding
      const threatColor = await threatIndicator.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      
      if (threatColor.includes('255, 0, 0')) {
        console.log('High threat level detected!');
      }
    }
    
    // Recent security events
    const securityEvents = page.locator('.security-events, [data-testid="security-events"]');
    if (await securityEvents.count() > 0) {
      const events = await securityEvents.locator('.event-item').all();
      
      for (const event of events.slice(0, 3)) {
        const eventType = await event.locator('.event-type').textContent();
        const eventTime = await event.locator('.event-time').textContent();
        const eventSeverity = await event.locator('.event-severity').textContent();
        
        console.log(`Security event: ${eventType} at ${eventTime} (${eventSeverity})`);
        
        // Check for failed login attempts
        if (eventType?.includes('Failed Login')) {
          const ipAddress = await event.locator('.event-ip').textContent();
          console.log(`Failed login from IP: ${ipAddress}`);
          
          // Block IP action
          const blockButton = event.locator('button:has-text("ブロック"), button:has-text("Block")');
          if (await blockButton.count() > 0) {
            console.log('Can block this IP address');
          }
        }
      }
    }
    
    // IP whitelist/blacklist management
    const ipManagement = page.locator('.ip-management, [data-testid="ip-management"]');
    if (await ipManagement.count() > 0) {
      // Add IP to whitelist
      const addIpButton = ipManagement.locator('button:has-text("IP追加")');
      if (await addIpButton.count() > 0) {
        await addIpButton.click();
        
        const ipModal = page.locator('.ip-modal');
        await expect(ipModal).toBeVisible();
        
        await ipModal.locator('input[name="ipAddress"]').fill('192.168.1.1');
        await ipModal.locator('select[name="listType"]').selectOption('whitelist');
        await ipModal.locator('input[name="comment"]').fill('Office network');
        
        // Cancel
        await ipModal.locator('button:has-text("キャンセル")').click();
      }
    }
  });

  test('Content moderation queue', async ({ page }) => {
    await page.goto('/admin/moderation');
    
    // Moderation queue
    const moderationQueue = page.locator('.moderation-queue, [data-testid="moderation-queue"]');
    await expect(moderationQueue).toBeVisible();
    
    // Filter by content type
    const contentFilter = page.locator('select[name="contentType"]');
    await contentFilter.selectOption('chat_messages');
    
    // Flagged items
    const flaggedItems = moderationQueue.locator('.flagged-item');
    const itemCount = await flaggedItems.count();
    
    if (itemCount > 0) {
      console.log(`Found ${itemCount} items for moderation`);
      
      const firstItem = flaggedItems.first();
      
      // Item details
      const userName = await firstItem.locator('.user-name').textContent();
      const content = await firstItem.locator('.flagged-content').textContent();
      const reason = await firstItem.locator('.flag-reason').textContent();
      
      console.log(`Flagged content from ${userName}: ${reason}`);
      
      // Moderation actions
      const actions = firstItem.locator('.moderation-actions');
      
      // Approve
      const approveButton = actions.locator('button:has-text("承認"), button:has-text("Approve")');
      // Reject
      const rejectButton = actions.locator('button:has-text("拒否"), button:has-text("Reject")');
      // Warn user
      const warnButton = actions.locator('button:has-text("警告"), button:has-text("Warn")');
      
      // Check available actions
      for (const [action, button] of Object.entries({ approve: approveButton, reject: rejectButton, warn: warnButton })) {
        if (await button.count() > 0) {
          console.log(`Moderation action available: ${action}`);
        }
      }
    }
    
    // Auto-moderation settings
    const autoModSettings = page.locator('.auto-moderation-settings, [data-testid="auto-mod-settings"]');
    if (await autoModSettings.count() > 0) {
      const toggles = {
        profanityFilter: autoModSettings.locator('input[name="enableProfanityFilter"]'),
        spamDetection: autoModSettings.locator('input[name="enableSpamDetection"]'),
        aiContentFilter: autoModSettings.locator('input[name="enableAiContentFilter"]')
      };
      
      for (const [setting, toggle] of Object.entries(toggles)) {
        if (await toggle.count() > 0) {
          const isEnabled = await toggle.isChecked();
          console.log(`Auto-moderation ${setting}: ${isEnabled ? 'enabled' : 'disabled'}`);
        }
      }
    }
  });

  test('System health monitoring', async ({ page }) => {
    await page.goto('/admin/system-health');
    
    // System health dashboard
    const healthDashboard = page.locator('.health-dashboard, [data-testid="system-health"]');
    await expect(healthDashboard).toBeVisible();
    
    // Service status
    const services = {
      api: healthDashboard.locator('.service-status:has-text("API")'),
      database: healthDashboard.locator('.service-status:has-text("Database")'),
      redis: healthDashboard.locator('.service-status:has-text("Redis")'),
      openai: healthDashboard.locator('.service-status:has-text("OpenAI")'),
      stripe: healthDashboard.locator('.service-status:has-text("Stripe")')
    };
    
    for (const [service, locator] of Object.entries(services)) {
      if (await locator.count() > 0) {
        const status = await locator.locator('.status-indicator').textContent();
        const uptime = await locator.locator('.uptime').textContent();
        console.log(`${service}: ${status} (${uptime} uptime)`);
        
        // Check for issues
        if (status?.includes('Degraded') || status?.includes('Down')) {
          const issueDetails = await locator.locator('.issue-details').textContent();
          console.log(`Issue: ${issueDetails}`);
        }
      }
    }
    
    // Performance metrics
    const performanceMetrics = healthDashboard.locator('.performance-metrics');
    if (await performanceMetrics.count() > 0) {
      const metrics = {
        responseTime: await performanceMetrics.locator('.metric:has-text("応答時間")').textContent(),
        throughput: await performanceMetrics.locator('.metric:has-text("スループット")').textContent(),
        errorRate: await performanceMetrics.locator('.metric:has-text("エラー率")').textContent(),
        cpuUsage: await performanceMetrics.locator('.metric:has-text("CPU使用率")').textContent()
      };
      
      console.log('System performance:', metrics);
    }
    
    // Alerts configuration
    const alertsButton = page.locator('button:has-text("アラート設定")');
    if (await alertsButton.count() > 0) {
      await alertsButton.click();
      
      const alertsModal = page.locator('.alerts-modal');
      await expect(alertsModal).toBeVisible();
      
      // Alert rules
      const alertRules = await alertsModal.locator('.alert-rule').all();
      console.log(`Configured ${alertRules.length} alert rules`);
      
      // Close modal
      await alertsModal.locator('button:has-text("閉じる")').click();
    }
  });
});