import { test, expect } from '@playwright/test';

test.describe('Profile Settings Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('Profile settings page access and navigation', async ({ page }) => {
    // Method 1: From dashboard
    const profileLink = page.locator('a:has-text("プロフィール"), a:has-text("Profile"), a:has-text("設定")');
    if (await profileLink.count() > 0) {
      await profileLink.click();
      await page.waitForURL(/profile|settings/);
    } else {
      // Method 2: From user menu
      const userMenu = page.locator('[data-testid="user-menu"], .user-menu, button[aria-label*="ユーザー"]');
      await userMenu.click();
      
      const settingsMenuItem = page.locator('a:has-text("設定"), a:has-text("Settings")');
      await settingsMenuItem.click();
      await page.waitForURL(/profile|settings/);
    }
    
    // Verify on settings page
    await expect(page.locator('h1:has-text("プロフィール"), h1:has-text("Profile"), h1:has-text("設定")')).toBeVisible();
    
    // Should show different sections
    const sections = {
      basic: page.locator(':has-text("基本情報"), :has-text("Basic Information")'),
      security: page.locator(':has-text("セキュリティ"), :has-text("Security")'),
      notifications: page.locator(':has-text("通知"), :has-text("Notifications")'),
      preferences: page.locator(':has-text("設定"), :has-text("Preferences")')
    };
    
    let visibleSections = 0;
    for (const [name, locator] of Object.entries(sections)) {
      if (await locator.count() > 0) {
        console.log(`Found section: ${name}`);
        visibleSections++;
      }
    }
    
    expect(visibleSections).toBeGreaterThan(0);
  });

  test('Basic profile information update', async ({ page }) => {
    await page.goto('/profile');
    
    // Basic info form
    const basicInfoSection = page.locator('.basic-info, [data-testid="basic-info"]');
    await expect(basicInfoSection).toBeVisible();
    
    // Username field
    const usernameInput = page.locator('input[name="username"], input[name="displayName"]');
    if (await usernameInput.count() > 0) {
      const currentUsername = await usernameInput.inputValue();
      
      // Update username
      const newUsername = `TestUser_${Date.now()}`;
      await usernameInput.clear();
      await usernameInput.fill(newUsername);
      
      // Bio/Description
      const bioTextarea = page.locator('textarea[name="bio"], textarea[name="description"]');
      if (await bioTextarea.count() > 0) {
        await bioTextarea.clear();
        await bioTextarea.fill('This is my updated bio. I love chatting with AI characters!');
      }
      
      // Language preference
      const languageSelect = page.locator('select[name="language"], [data-testid="language-select"]');
      if (await languageSelect.count() > 0) {
        await languageSelect.selectOption('ja'); // or 'en'
      }
      
      // Save changes
      const saveButton = page.locator('button:has-text("保存"), button:has-text("Save")');
      await saveButton.click();
      
      // Should show success message
      await expect(page.locator(':has-text("保存しました"), :has-text("Saved"), :has-text("更新")')).toBeVisible();
      
      // Reload to verify persistence
      await page.reload();
      
      // Username should be updated
      const updatedUsername = await usernameInput.inputValue();
      expect(updatedUsername).toBe(newUsername);
    }
  });

  test('Email change with verification', async ({ page }) => {
    await page.goto('/profile');
    
    // Find email section
    const emailSection = page.locator('.email-section, [data-testid="email-section"]');
    
    if (await emailSection.count() > 0) {
      // Current email display
      const currentEmail = emailSection.locator('.current-email, :has-text("@")');
      await expect(currentEmail).toBeVisible();
      
      // Change email button
      const changeEmailButton = emailSection.locator('button:has-text("変更"), button:has-text("Change")');
      await changeEmailButton.click();
      
      // Email change modal/form
      const emailModal = page.locator('.email-change-modal, [role="dialog"]');
      await expect(emailModal).toBeVisible();
      
      // New email input
      const newEmailInput = emailModal.locator('input[name="newEmail"], input[type="email"]');
      await newEmailInput.fill('newemail@example.com');
      
      // Confirm email
      const confirmEmailInput = emailModal.locator('input[name="confirmEmail"]');
      if (await confirmEmailInput.count() > 0) {
        await confirmEmailInput.fill('newemail@example.com');
      }
      
      // Current password for verification
      const passwordInput = emailModal.locator('input[name="currentPassword"], input[type="password"]');
      await passwordInput.fill('TestPassword123!');
      
      // Submit
      await emailModal.locator('button[type="submit"], button:has-text("確認")').click();
      
      // Should show verification message
      await expect(page.locator(':has-text("確認メール"), :has-text("verification email")')).toBeVisible();
    }
  });

  test('Password change flow', async ({ page }) => {
    await page.goto('/profile');
    
    // Navigate to security section
    const securityTab = page.locator('button:has-text("セキュリティ"), a:has-text("Security")');
    if (await securityTab.count() > 0) {
      await securityTab.click();
    }
    
    // Password change form
    const passwordSection = page.locator('.password-section, [data-testid="password-section"]');
    await expect(passwordSection).toBeVisible();
    
    // Current password
    const currentPasswordInput = page.locator('input[name="currentPassword"]');
    await currentPasswordInput.fill('TestPassword123!');
    
    // New password
    const newPasswordInput = page.locator('input[name="newPassword"]');
    await newPasswordInput.fill('NewTestPassword123!');
    
    // Confirm new password
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    await confirmPasswordInput.fill('NewTestPassword123!');
    
    // Password strength indicator
    const strengthIndicator = page.locator('.password-strength, [data-testid="password-strength"]');
    if (await strengthIndicator.count() > 0) {
      await expect(strengthIndicator).toBeVisible();
      
      // Should show strong password
      await expect(strengthIndicator).toContainText(/強|Strong/);
    }
    
    // Save button
    const updateButton = page.locator('button:has-text("パスワードを更新"), button:has-text("Update Password")');
    await updateButton.click();
    
    // Success message
    await expect(page.locator(':has-text("パスワードを更新しました"), :has-text("Password updated")')).toBeVisible();
    
    // Should require re-login or show session notice
    const reloginNotice = page.locator(':has-text("再ログイン"), :has-text("log in again")');
    if (await reloginNotice.count() > 0) {
      console.log('Password change requires re-login');
    }
  });

  test('Notification preferences', async ({ page }) => {
    await page.goto('/profile');
    
    // Navigate to notifications
    const notificationsTab = page.locator('button:has-text("通知"), a:has-text("Notifications")');
    if (await notificationsTab.count() > 0) {
      await notificationsTab.click();
    }
    
    // Notification settings
    const notificationSettings = {
      emailNotifications: page.locator('input[name="emailNotifications"]'),
      characterMessages: page.locator('input[name="characterMessages"]'),
      purchaseConfirmations: page.locator('input[name="purchaseConfirmations"]'),
      affinityMilestones: page.locator('input[name="affinityMilestones"]'),
      systemUpdates: page.locator('input[name="systemUpdates"]'),
      marketingEmails: page.locator('input[name="marketingEmails"]')
    };
    
    // Toggle some settings
    for (const [name, checkbox] of Object.entries(notificationSettings)) {
      if (await checkbox.count() > 0) {
        const isChecked = await checkbox.isChecked();
        await checkbox.click();
        
        // Verify state changed
        const newState = await checkbox.isChecked();
        expect(newState).toBe(!isChecked);
        
        console.log(`${name}: ${isChecked} -> ${newState}`);
      }
    }
    
    // Save preferences
    const saveButton = page.locator('button:has-text("保存"), button:has-text("Save")');
    await saveButton.click();
    
    // Success notification
    await expect(page.locator(':has-text("通知設定を更新"), :has-text("Notification preferences updated")')).toBeVisible();
  });

  test('Language and regional settings', async ({ page }) => {
    await page.goto('/profile');
    
    // Preferences section
    const preferencesSection = page.locator('.preferences-section, [data-testid="preferences"]');
    
    if (await preferencesSection.count() > 0) {
      // Language selection
      const languageSelect = page.locator('select[name="language"]');
      const currentLang = await languageSelect.inputValue();
      
      // Change language
      const newLang = currentLang === 'ja' ? 'en' : 'ja';
      await languageSelect.selectOption(newLang);
      
      // Timezone
      const timezoneSelect = page.locator('select[name="timezone"]');
      if (await timezoneSelect.count() > 0) {
        await timezoneSelect.selectOption('Asia/Tokyo');
      }
      
      // Date format
      const dateFormatSelect = page.locator('select[name="dateFormat"]');
      if (await dateFormatSelect.count() > 0) {
        await dateFormatSelect.selectOption('YYYY/MM/DD');
      }
      
      // Currency (for display)
      const currencySelect = page.locator('select[name="currency"]');
      if (await currencySelect.count() > 0) {
        await currencySelect.selectOption('JPY');
      }
      
      // Save
      await page.click('button:has-text("保存")');
      
      // Page might reload with new language
      await page.waitForTimeout(1000);
      
      // Verify language change
      if (newLang === 'en') {
        await expect(page.locator('h1')).toContainText(/Profile|Settings/);
      } else {
        await expect(page.locator('h1')).toContainText(/プロフィール|設定/);
      }
    }
  });

  test('Privacy settings', async ({ page }) => {
    await page.goto('/profile');
    
    // Privacy tab
    const privacyTab = page.locator('button:has-text("プライバシー"), a:has-text("Privacy")');
    if (await privacyTab.count() > 0) {
      await privacyTab.click();
      
      const privacySettings = {
        profileVisibility: page.locator('select[name="profileVisibility"]'),
        showActivity: page.locator('input[name="showActivity"]'),
        showFavorites: page.locator('input[name="showFavorites"]'),
        showAchievements: page.locator('input[name="showAchievements"]'),
        allowMessages: page.locator('input[name="allowMessages"]')
      };
      
      // Profile visibility
      if (await privacySettings.profileVisibility.count() > 0) {
        await privacySettings.profileVisibility.selectOption('friends'); // public, friends, private
      }
      
      // Toggle privacy options
      for (const [name, element] of Object.entries(privacySettings)) {
        if (name !== 'profileVisibility' && await element.count() > 0) {
          await element.click();
          console.log(`Updated ${name}`);
        }
      }
      
      // Save
      await page.click('button:has-text("保存")');
      await expect(page.locator(':has-text("プライバシー設定"), :has-text("Privacy settings")')).toBeVisible();
    }
  });

  test('Account deletion request', async ({ page }) => {
    await page.goto('/profile');
    
    // Danger zone or account section
    const dangerZone = page.locator('.danger-zone, [data-testid="danger-zone"], :has-text("アカウント削除")');
    
    if (await dangerZone.count() > 0) {
      // Scroll to danger zone
      await dangerZone.scrollIntoViewIfNeeded();
      
      // Delete account button
      const deleteButton = dangerZone.locator('button:has-text("削除"), button:has-text("Delete")');
      await deleteButton.click();
      
      // Confirmation modal
      const confirmModal = page.locator('[role="dialog"], .confirm-delete-modal');
      await expect(confirmModal).toBeVisible();
      
      // Should show warnings
      await expect(confirmModal.locator(':has-text("取り消せません"), :has-text("cannot be undone")')).toBeVisible();
      await expect(confirmModal.locator(':has-text("データ"), :has-text("data")')).toBeVisible();
      
      // Type confirmation
      const confirmInput = confirmModal.locator('input[name="confirmDelete"]');
      if (await confirmInput.count() > 0) {
        await confirmInput.fill('DELETE');
      }
      
      // Enter password
      const passwordInput = confirmModal.locator('input[type="password"]');
      await passwordInput.fill('TestPassword123!');
      
      // DON'T actually delete - just verify the flow
      const cancelButton = confirmModal.locator('button:has-text("キャンセル"), button:has-text("Cancel")');
      await cancelButton.click();
      
      await expect(confirmModal).not.toBeVisible();
    }
  });

  test('Two-factor authentication setup', async ({ page }) => {
    await page.goto('/profile');
    
    // Security section
    const securityTab = page.locator('button:has-text("セキュリティ")');
    if (await securityTab.count() > 0) {
      await securityTab.click();
    }
    
    // 2FA section
    const twoFactorSection = page.locator('.two-factor-section, [data-testid="2fa-section"]');
    
    if (await twoFactorSection.count() > 0) {
      const enable2FAButton = twoFactorSection.locator('button:has-text("有効にする"), button:has-text("Enable")');
      
      if (await enable2FAButton.count() > 0) {
        await enable2FAButton.click();
        
        // 2FA setup modal
        const setupModal = page.locator('.twofa-setup-modal, [role="dialog"]');
        await expect(setupModal).toBeVisible();
        
        // Should show QR code
        const qrCode = setupModal.locator('.qr-code, img[alt*="QR"], canvas');
        await expect(qrCode).toBeVisible();
        
        // Secret key for manual entry
        const secretKey = setupModal.locator('.secret-key, code');
        if (await secretKey.count() > 0) {
          const key = await secretKey.textContent();
          console.log('2FA secret key displayed (length):', key?.length);
        }
        
        // Verification code input
        const codeInput = setupModal.locator('input[name="verificationCode"]');
        await codeInput.fill('123456'); // Would need real TOTP code
        
        // Cancel for now
        await setupModal.locator('button:has-text("キャンセル")').click();
      }
    }
  });

  test('Session management', async ({ page }) => {
    await page.goto('/profile');
    
    // Security section
    const securityTab = page.locator('button:has-text("セキュリティ")');
    if (await securityTab.count() > 0) {
      await securityTab.click();
    }
    
    // Active sessions
    const sessionsSection = page.locator('.sessions-section, [data-testid="active-sessions"]');
    
    if (await sessionsSection.count() > 0) {
      await expect(sessionsSection).toBeVisible();
      
      // Current session
      const currentSession = sessionsSection.locator('.current-session, [data-current="true"]');
      await expect(currentSession).toBeVisible();
      
      // Should show device info
      await expect(currentSession.locator(':has-text("現在"), :has-text("Current")')).toBeVisible();
      
      // Other sessions
      const otherSessions = sessionsSection.locator('.session-item:not(.current-session)');
      const sessionCount = await otherSessions.count();
      
      if (sessionCount > 0) {
        console.log(`Found ${sessionCount} other active sessions`);
        
        // Can revoke other sessions
        const revokeButton = otherSessions.first().locator('button:has-text("取り消す"), button:has-text("Revoke")');
        if (await revokeButton.count() > 0) {
          await revokeButton.click();
          
          // Confirmation
          await page.click('button:has-text("確認"), button:has-text("Confirm")');
          
          // Should show success
          await expect(page.locator(':has-text("セッションを取り消しました"), :has-text("Session revoked")')).toBeVisible();
        }
      }
      
      // Revoke all other sessions
      const revokeAllButton = sessionsSection.locator('button:has-text("すべて取り消す"), button:has-text("Revoke all")');
      if (await revokeAllButton.count() > 0) {
        console.log('Revoke all sessions option available');
      }
    }
  });

  test('Export account data', async ({ page }) => {
    await page.goto('/profile');
    
    // Data & Privacy section
    const dataSection = page.locator('.data-section, :has-text("データ"), :has-text("Data")');
    
    if (await dataSection.count() > 0) {
      const exportButton = dataSection.locator('button:has-text("エクスポート"), button:has-text("Export")');
      
      if (await exportButton.count() > 0) {
        await exportButton.click();
        
        // Export options modal
        const exportModal = page.locator('.export-modal, [role="dialog"]');
        await expect(exportModal).toBeVisible();
        
        // Data types to export
        const dataTypes = {
          profile: exportModal.locator('input[name="exportProfile"]'),
          messages: exportModal.locator('input[name="exportMessages"]'),
          purchases: exportModal.locator('input[name="exportPurchases"]'),
          affinityData: exportModal.locator('input[name="exportAffinity"]'),
          images: exportModal.locator('input[name="exportImages"]')
        };
        
        // Select all data types
        for (const [type, checkbox] of Object.entries(dataTypes)) {
          if (await checkbox.count() > 0) {
            await checkbox.check();
            console.log(`Selected ${type} for export`);
          }
        }
        
        // Format selection
        const formatSelect = exportModal.locator('select[name="exportFormat"]');
        if (await formatSelect.count() > 0) {
          await formatSelect.selectOption('json'); // or 'csv', 'zip'
        }
        
        // Request export
        await exportModal.locator('button:has-text("リクエスト"), button:has-text("Request")').click();
        
        // Should show processing message
        await expect(page.locator(':has-text("準備中"), :has-text("preparing"), :has-text("メールで")')).toBeVisible();
      }
    }
  });
});