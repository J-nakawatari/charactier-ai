import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Admin login
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'AdminPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/dashboard');
  });

  test('Admin dashboard overview', async ({ page }) => {
    // Verify admin dashboard loaded
    await expect(page.locator('h1:has-text("管理ダッシュボード"), h1:has-text("Admin Dashboard")')).toBeVisible();
    
    // Check main statistics cards
    const statsCards = {
      totalUsers: page.locator('[data-testid="total-users"], .stat-card:has-text("ユーザー数")'),
      activeUsers: page.locator('[data-testid="active-users"], .stat-card:has-text("アクティブユーザー")'),
      totalRevenue: page.locator('[data-testid="total-revenue"], .stat-card:has-text("総売上")'),
      totalTokens: page.locator('[data-testid="total-tokens"], .stat-card:has-text("総トークン")'),
      totalCharacters: page.locator('[data-testid="total-characters"], .stat-card:has-text("キャラクター数")'),
      totalChats: page.locator('[data-testid="total-chats"], .stat-card:has-text("チャット数")')
    };
    
    for (const [stat, locator] of Object.entries(statsCards)) {
      if (await locator.count() > 0) {
        await expect(locator).toBeVisible();
        const value = await locator.locator('.stat-value, .number').textContent();
        console.log(`${stat}: ${value}`);
        
        // Should have numeric value
        expect(value).toMatch(/\d/);
      }
    }
    
    // Revenue chart
    const revenueChart = page.locator('.revenue-chart, [data-testid="revenue-chart"], canvas');
    if (await revenueChart.count() > 0) {
      await expect(revenueChart).toBeVisible();
      
      // Time period selector
      const periodSelector = page.locator('select[name="period"], [data-testid="period-selector"]');
      if (await periodSelector.count() > 0) {
        await periodSelector.selectOption('7days');
        await page.waitForTimeout(1000); // Wait for chart update
        
        await periodSelector.selectOption('30days');
        await page.waitForTimeout(1000);
        
        await periodSelector.selectOption('12months');
        await page.waitForTimeout(1000);
      }
    }
    
    // Recent activity feed
    const activityFeed = page.locator('.activity-feed, [data-testid="activity-feed"]');
    if (await activityFeed.count() > 0) {
      await expect(activityFeed).toBeVisible();
      
      const activities = activityFeed.locator('.activity-item');
      const activityCount = await activities.count();
      console.log(`Recent activities: ${activityCount}`);
      
      if (activityCount > 0) {
        // Check first activity
        const firstActivity = activities.first();
        await expect(firstActivity.locator('.activity-time')).toBeVisible();
        await expect(firstActivity.locator('.activity-description')).toBeVisible();
      }
    }
  });

  test('User management functionality', async ({ page }) => {
    // Navigate to user management
    await page.click('a:has-text("ユーザー管理"), a:has-text("Users")');
    await page.waitForURL('**/admin/users');
    
    // User list should be displayed
    await expect(page.locator('h1:has-text("ユーザー管理")')).toBeVisible();
    
    // Search functionality
    const searchInput = page.locator('input[placeholder*="検索"], input[placeholder*="Search"]');
    await searchInput.fill('test');
    await page.waitForTimeout(500); // Debounce
    
    // Filter options
    const filters = {
      status: page.locator('select[name="status"]'),
      role: page.locator('select[name="role"]'),
      dateRange: page.locator('select[name="dateRange"]')
    };
    
    if (await filters.status.count() > 0) {
      await filters.status.selectOption('active');
    }
    
    // User table
    const userTable = page.locator('table, [data-testid="user-table"]');
    await expect(userTable).toBeVisible();
    
    // Check table headers
    const headers = ['ID', 'メール', '名前', '登録日', 'ステータス', '操作'];
    for (const header of headers) {
      const th = userTable.locator(`th:has-text("${header}")`);
      if (await th.count() > 0) {
        await expect(th).toBeVisible();
      }
    }
    
    // User row actions
    const firstUserRow = userTable.locator('tbody tr').first();
    if (await firstUserRow.count() > 0) {
      // View details
      const viewButton = firstUserRow.locator('button:has-text("詳細"), button[aria-label*="詳細"]');
      if (await viewButton.count() > 0) {
        await viewButton.click();
        
        // User detail modal/page
        await expect(page.locator('.user-detail, [data-testid="user-detail"]')).toBeVisible();
        
        // User info sections
        const userInfo = {
          basicInfo: page.locator('.basic-info, :has-text("基本情報")'),
          tokenInfo: page.locator('.token-info, :has-text("トークン情報")'),
          purchaseHistory: page.locator('.purchase-history, :has-text("購入履歴")'),
          chatStats: page.locator('.chat-stats, :has-text("チャット統計")')
        };
        
        for (const [section, locator] of Object.entries(userInfo)) {
          if (await locator.count() > 0) {
            console.log(`User detail section: ${section}`);
          }
        }
        
        // Close detail view
        await page.click('button:has-text("閉じる"), button[aria-label*="Close"]');
      }
    }
    
    // Bulk actions
    const bulkActionCheckbox = userTable.locator('input[type="checkbox"]').first();
    if (await bulkActionCheckbox.count() > 0) {
      await bulkActionCheckbox.check();
      
      // Bulk action menu should appear
      const bulkActions = page.locator('.bulk-actions, [data-testid="bulk-actions"]');
      if (await bulkActions.count() > 0) {
        await expect(bulkActions).toBeVisible();
        
        // Available bulk actions
        const actions = ['エクスポート', '通知送信', 'ステータス変更'];
        for (const action of actions) {
          const actionButton = bulkActions.locator(`button:has-text("${action}")`);
          if (await actionButton.count() > 0) {
            console.log(`Bulk action available: ${action}`);
          }
        }
      }
    }
  });

  test('Character management', async ({ page }) => {
    // Navigate to character management
    await page.click('a:has-text("キャラクター管理"), a:has-text("Characters")');
    await page.waitForURL('**/admin/characters');
    
    // Create new character button
    const createButton = page.locator('button:has-text("新規作成"), button:has-text("Create")');
    await expect(createButton).toBeVisible();
    
    await createButton.click();
    await page.waitForURL('**/admin/characters/new');
    
    // Character creation form
    const form = page.locator('form, [data-testid="character-form"]');
    await expect(form).toBeVisible();
    
    // Fill basic information
    await page.fill('input[name="name"]', 'テストキャラクター');
    await page.fill('textarea[name="description"]', 'これはテスト用のキャラクターです。');
    
    // Character type
    const typeSelect = page.locator('select[name="type"]');
    await typeSelect.selectOption('paid'); // free or paid
    
    // If paid, set price
    const priceInput = page.locator('input[name="price"]');
    if (await priceInput.isVisible()) {
      await priceInput.fill('1000');
    }
    
    // Personality settings
    const personalitySelect = page.locator('select[name="personalityPreset"]');
    await personalitySelect.selectOption('friendly');
    
    // AI model selection
    const modelSelect = page.locator('select[name="aiModel"]');
    await modelSelect.selectOption('gpt-4-mini');
    
    // System prompt
    const systemPrompt = page.locator('textarea[name="systemPrompt"]');
    await systemPrompt.fill('あなたは親切で優しいキャラクターです。ユーザーとの会話を楽しんでください。');
    
    // Image upload
    const imageUpload = page.locator('input[type="file"][name="avatar"]');
    if (await imageUpload.count() > 0) {
      // Would upload test image
      console.log('Image upload field available');
    }
    
    // Tags
    const tagsInput = page.locator('input[name="tags"]');
    if (await tagsInput.count() > 0) {
      await tagsInput.fill('friendly, cheerful, supportive');
    }
    
    // Save (but don't actually create in test)
    const saveButton = page.locator('button:has-text("保存"), button[type="submit"]');
    // await saveButton.click(); // Commented out to not create test data
    
    // Go back to list
    await page.click('a:has-text("戻る"), button:has-text("Cancel")');
    
    // Character list view
    const characterGrid = page.locator('.character-grid, [data-testid="character-list"]');
    await expect(characterGrid).toBeVisible();
    
    // Character statistics
    const stats = page.locator('.character-stats, [data-testid="character-stats"]');
    if (await stats.count() > 0) {
      const totalChars = stats.locator(':has-text("総数")');
      const freeChars = stats.locator(':has-text("無料")');
      const paidChars = stats.locator(':has-text("有料")');
      
      for (const stat of [totalChars, freeChars, paidChars]) {
        if (await stat.count() > 0) {
          const value = await stat.textContent();
          console.log(value);
        }
      }
    }
  });

  test('Token and pricing management', async ({ page }) => {
    // Navigate to token management
    await page.click('a:has-text("トークン管理"), a:has-text("Tokens")');
    await page.waitForURL('**/admin/tokens');
    
    // Token pack list
    const packList = page.locator('.token-pack-list, [data-testid="token-packs"]');
    await expect(packList).toBeVisible();
    
    // Check 99% profit calculation
    const packs = packList.locator('.pack-item, tr');
    const packCount = await packs.count();
    
    for (let i = 0; i < Math.min(3, packCount); i++) {
      const pack = packs.nth(i);
      
      const price = await pack.locator('.price, td:nth-child(2)').textContent();
      const tokens = await pack.locator('.tokens, td:nth-child(3)').textContent();
      const profitRate = await pack.locator('.profit-rate, td:nth-child(4)').textContent();
      
      console.log(`Pack ${i + 1}: ${price} for ${tokens} tokens, Profit: ${profitRate}`);
      
      // Verify 99% profit
      if (profitRate?.includes('%')) {
        const rate = parseFloat(profitRate.replace('%', ''));
        expect(rate).toBeGreaterThanOrEqual(99);
      }
    }
    
    // Edit token pack
    const editButton = packs.first().locator('button:has-text("編集"), button[aria-label*="Edit"]');
    if (await editButton.count() > 0) {
      await editButton.click();
      
      // Edit form
      const editModal = page.locator('.edit-modal, [role="dialog"]');
      await expect(editModal).toBeVisible();
      
      // Price input with profit calculation
      const priceInput = editModal.locator('input[name="price"]');
      const profitDisplay = editModal.locator('.profit-calculation, [data-testid="profit-display"]');
      
      // Change price and check profit update
      await priceInput.clear();
      await priceInput.fill('5000');
      await page.waitForTimeout(500); // Wait for calculation
      
      if (await profitDisplay.count() > 0) {
        const newProfit = await profitDisplay.textContent();
        console.log('Updated profit:', newProfit);
      }
      
      // Cancel edit
      await editModal.locator('button:has-text("キャンセル")').click();
    }
    
    // Token usage statistics
    const usageStats = page.locator('.token-usage-stats, [data-testid="usage-stats"]');
    if (await usageStats.count() > 0) {
      await expect(usageStats).toBeVisible();
      
      // Daily/Monthly usage
      const dailyUsage = usageStats.locator(':has-text("本日の使用量")');
      const monthlyUsage = usageStats.locator(':has-text("今月の使用量")');
      
      for (const usage of [dailyUsage, monthlyUsage]) {
        if (await usage.count() > 0) {
          const value = await usage.textContent();
          console.log(value);
        }
      }
    }
  });

  test('Revenue and analytics', async ({ page }) => {
    // Navigate to revenue/analytics
    await page.click('a:has-text("売上分析"), a:has-text("Revenue")');
    await page.waitForURL('**/admin/revenue');
    
    // Date range selector
    const dateRange = page.locator('[data-testid="date-range"], .date-range-picker');
    if (await dateRange.count() > 0) {
      await dateRange.click();
      
      // Preset options
      const presets = ['今日', '昨日', '過去7日間', '過去30日間', '今月', '先月'];
      for (const preset of presets) {
        const option = page.locator(`button:has-text("${preset}")`);
        if (await option.count() > 0) {
          console.log(`Date preset available: ${preset}`);
        }
      }
    }
    
    // Revenue breakdown
    const breakdown = {
      tokenSales: page.locator('[data-testid="token-revenue"], .revenue-card:has-text("トークン売上")'),
      characterSales: page.locator('[data-testid="character-revenue"], .revenue-card:has-text("キャラクター売上")'),
      totalRevenue: page.locator('[data-testid="total-revenue"], .revenue-card:has-text("総売上")')
    };
    
    for (const [type, locator] of Object.entries(breakdown)) {
      if (await locator.count() > 0) {
        const amount = await locator.locator('.amount, .revenue-value').textContent();
        console.log(`${type}: ${amount}`);
      }
    }
    
    // Transaction list
    const transactionTable = page.locator('.transaction-table, [data-testid="transactions"]');
    if (await transactionTable.count() > 0) {
      await expect(transactionTable).toBeVisible();
      
      // Export functionality
      const exportButton = page.locator('button:has-text("エクスポート"), button:has-text("Export")');
      if (await exportButton.count() > 0) {
        await exportButton.click();
        
        // Export options
        const exportModal = page.locator('.export-modal');
        if (await exportModal.count() > 0) {
          await expect(exportModal).toBeVisible();
          
          // Format options
          const csvOption = exportModal.locator('input[value="csv"]');
          const excelOption = exportModal.locator('input[value="excel"]');
          
          if (await csvOption.count() > 0) {
            await csvOption.check();
          }
          
          // Cancel export
          await exportModal.locator('button:has-text("キャンセル")').click();
        }
      }
    }
  });

  test('System settings and configuration', async ({ page }) => {
    // Navigate to system settings
    await page.click('a:has-text("システム設定"), a:has-text("Settings")');
    await page.waitForURL('**/admin/settings');
    
    // Settings categories
    const categories = {
      general: page.locator('button:has-text("一般"), button:has-text("General")'),
      security: page.locator('button:has-text("セキュリティ"), button:has-text("Security")'),
      ai: page.locator('button:has-text("AI設定"), button:has-text("AI")'),
      payment: page.locator('button:has-text("決済"), button:has-text("Payment")'),
      email: page.locator('button:has-text("メール"), button:has-text("Email")')
    };
    
    // Test AI settings
    if (await categories.ai.count() > 0) {
      await categories.ai.click();
      
      // OpenAI API key (masked)
      const apiKeyInput = page.locator('input[name="openaiApiKey"]');
      if (await apiKeyInput.count() > 0) {
        const value = await apiKeyInput.inputValue();
        expect(value).toMatch(/\*{4,}/); // Should be masked
      }
      
      // Model settings
      const defaultModel = page.locator('select[name="defaultModel"]');
      if (await defaultModel.count() > 0) {
        const currentModel = await defaultModel.inputValue();
        console.log('Default AI model:', currentModel);
      }
      
      // Rate limits
      const rateLimitInput = page.locator('input[name="aiRateLimit"]');
      if (await rateLimitInput.count() > 0) {
        const limit = await rateLimitInput.inputValue();
        console.log('AI rate limit:', limit);
      }
    }
    
    // Test security settings
    if (await categories.security.count() > 0) {
      await categories.security.click();
      
      // Security options
      const securityOptions = {
        twoFactor: page.locator('input[name="requireAdminTwoFactor"]'),
        ipWhitelist: page.locator('textarea[name="adminIpWhitelist"]'),
        sessionTimeout: page.locator('input[name="adminSessionTimeout"]'),
        passwordPolicy: page.locator('select[name="passwordPolicy"]')
      };
      
      for (const [option, locator] of Object.entries(securityOptions)) {
        if (await locator.count() > 0) {
          console.log(`Security option available: ${option}`);
        }
      }
    }
  });

  test('Admin activity logs', async ({ page }) => {
    // Navigate to activity logs
    await page.click('a:has-text("活動ログ"), a:has-text("Activity Logs")');
    await page.waitForURL('**/admin/logs');
    
    // Log filters
    const filters = {
      user: page.locator('select[name="adminUser"]'),
      action: page.locator('select[name="actionType"]'),
      dateRange: page.locator('input[name="dateRange"]')
    };
    
    // Filter by action type
    if (await filters.action.count() > 0) {
      await filters.action.selectOption('user_management');
    }
    
    // Log table
    const logTable = page.locator('.log-table, [data-testid="activity-logs"]');
    await expect(logTable).toBeVisible();
    
    // Check log entries
    const logEntries = logTable.locator('tbody tr');
    const entryCount = await logEntries.count();
    
    if (entryCount > 0) {
      const firstEntry = logEntries.first();
      
      // Log details
      const timestamp = await firstEntry.locator('td:nth-child(1)').textContent();
      const user = await firstEntry.locator('td:nth-child(2)').textContent();
      const action = await firstEntry.locator('td:nth-child(3)').textContent();
      const details = await firstEntry.locator('td:nth-child(4)').textContent();
      
      console.log('Latest activity:', { timestamp, user, action, details });
      
      // View details
      const detailButton = firstEntry.locator('button:has-text("詳細")');
      if (await detailButton.count() > 0) {
        await detailButton.click();
        
        // Detail modal
        const detailModal = page.locator('.log-detail-modal');
        await expect(detailModal).toBeVisible();
        
        // Should show full details
        await expect(detailModal.locator('.log-payload, pre')).toBeVisible();
        
        // Close modal
        await detailModal.locator('button:has-text("閉じる")').click();
      }
    }
  });

  test('Admin role and permission management', async ({ page }) => {
    // Navigate to admin users
    await page.click('a:has-text("管理者"), a:has-text("Admins")');
    await page.waitForURL('**/admin/admins');
    
    // Admin list
    const adminTable = page.locator('.admin-table, [data-testid="admin-list"]');
    await expect(adminTable).toBeVisible();
    
    // Add new admin button
    const addAdminButton = page.locator('button:has-text("管理者を追加"), button:has-text("Add Admin")');
    if (await addAdminButton.count() > 0) {
      await addAdminButton.click();
      
      // Add admin modal
      const addModal = page.locator('.add-admin-modal, [role="dialog"]');
      await expect(addModal).toBeVisible();
      
      // Email input
      await addModal.locator('input[name="email"]').fill('newadmin@example.com');
      
      // Role selection
      const roleSelect = addModal.locator('select[name="role"]');
      await roleSelect.selectOption('moderator'); // admin, moderator, support
      
      // Permissions
      const permissions = addModal.locator('input[type="checkbox"]');
      const permissionCount = await permissions.count();
      
      console.log(`Available permissions: ${permissionCount}`);
      
      // Cancel (don't actually add)
      await addModal.locator('button:has-text("キャンセル")').click();
    }
    
    // Edit existing admin permissions
    const firstAdmin = adminTable.locator('tbody tr').first();
    if (await firstAdmin.count() > 0) {
      const editButton = firstAdmin.locator('button:has-text("編集")');
      if (await editButton.count() > 0) {
        await editButton.click();
        
        // Permission edit modal
        const editModal = page.locator('.permission-edit-modal');
        await expect(editModal).toBeVisible();
        
        // Permission categories
        const permissionGroups = {
          users: editModal.locator('.permission-group:has-text("ユーザー管理")'),
          characters: editModal.locator('.permission-group:has-text("キャラクター管理")'),
          revenue: editModal.locator('.permission-group:has-text("売上管理")'),
          system: editModal.locator('.permission-group:has-text("システム設定")')
        };
        
        for (const [group, locator] of Object.entries(permissionGroups)) {
          if (await locator.count() > 0) {
            console.log(`Permission group: ${group}`);
          }
        }
        
        // Close modal
        await editModal.locator('button:has-text("閉じる")').click();
      }
    }
  });
});