import { test, expect } from '@playwright/test';

test.describe('Account Management Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to profile/account settings
    await page.goto('/profile');
  });

  test('Account overview and statistics', async ({ page }) => {
    // Account overview section
    const overviewSection = page.locator('.account-overview, [data-testid="account-overview"]');
    
    if (await overviewSection.count() > 0) {
      await expect(overviewSection).toBeVisible();
      
      // Account creation date
      const createdDate = overviewSection.locator(':has-text("登録日"), :has-text("Member since")');
      if (await createdDate.count() > 0) {
        const dateText = await createdDate.textContent();
        expect(dateText).toMatch(/\d{4}/); // Should contain year
      }
      
      // Account type/tier
      const accountType = overviewSection.locator('.account-type, :has-text("プラン"), :has-text("Plan")');
      if (await accountType.count() > 0) {
        const typeText = await accountType.textContent();
        console.log('Account type:', typeText);
      }
      
      // Statistics
      const stats = {
        totalChats: overviewSection.locator(':has-text("チャット数"), :has-text("Total chats")'),
        charactersUnlocked: overviewSection.locator(':has-text("解放キャラクター"), :has-text("Characters")'),
        tokensUsed: overviewSection.locator(':has-text("使用トークン"), :has-text("Tokens used")'),
        totalSpent: overviewSection.locator(':has-text("総額"), :has-text("Total spent")')
      };
      
      for (const [stat, locator] of Object.entries(stats)) {
        if (await locator.count() > 0) {
          const value = await locator.textContent();
          console.log(`${stat}: ${value}`);
        }
      }
    }
  });

  test('Email preferences and subscriptions', async ({ page }) => {
    // Email preferences section
    const emailPrefsTab = page.locator('button:has-text("メール設定"), a:has-text("Email")');
    if (await emailPrefsTab.count() > 0) {
      await emailPrefsTab.click();
    }
    
    // Email frequency
    const frequencySelect = page.locator('select[name="emailFrequency"]');
    if (await frequencySelect.count() > 0) {
      await frequencySelect.selectOption('weekly'); // immediate, daily, weekly, monthly, never
      
      // Email categories
      const emailCategories = {
        transactional: {
          label: 'トランザクション',
          locator: page.locator('input[name="emailTransactional"]'),
          required: true
        },
        affinityUpdates: {
          label: '親密度アップデート',
          locator: page.locator('input[name="emailAffinity"]'),
          required: false
        },
        newCharacters: {
          label: '新キャラクター',
          locator: page.locator('input[name="emailNewCharacters"]'),
          required: false
        },
        promotions: {
          label: 'プロモーション',
          locator: page.locator('input[name="emailPromotions"]'),
          required: false
        },
        newsletter: {
          label: 'ニュースレター',
          locator: page.locator('input[name="emailNewsletter"]'),
          required: false
        }
      };
      
      for (const [category, config] of Object.entries(emailCategories)) {
        if (await config.locator.count() > 0) {
          // Required emails can't be unchecked
          if (config.required) {
            const isDisabled = await config.locator.isDisabled();
            expect(isDisabled).toBe(true);
            console.log(`${category} is required and disabled`);
          } else {
            // Toggle optional emails
            const currentState = await config.locator.isChecked();
            await config.locator.click();
            const newState = await config.locator.isChecked();
            expect(newState).toBe(!currentState);
          }
        }
      }
      
      // Save preferences
      await page.click('button:has-text("保存")');
      await expect(page.locator(':has-text("メール設定を更新")')).toBeVisible();
    }
  });

  test('Connected accounts and social login', async ({ page }) => {
    // Connected accounts section
    const connectedAccountsSection = page.locator('.connected-accounts, [data-testid="connected-accounts"]');
    
    if (await connectedAccountsSection.count() > 0) {
      await expect(connectedAccountsSection).toBeVisible();
      
      // Check for social providers
      const providers = {
        google: {
          locator: connectedAccountsSection.locator('.google-account, :has-text("Google")'),
          connected: false
        },
        twitter: {
          locator: connectedAccountsSection.locator('.twitter-account, :has-text("Twitter")'),
          connected: false
        },
        discord: {
          locator: connectedAccountsSection.locator('.discord-account, :has-text("Discord")'),
          connected: false
        }
      };
      
      for (const [provider, config] of Object.entries(providers)) {
        if (await config.locator.count() > 0) {
          // Check if already connected
          const connectButton = config.locator.locator('button:has-text("接続"), button:has-text("Connect")');
          const disconnectButton = config.locator.locator('button:has-text("解除"), button:has-text("Disconnect")');
          
          if (await disconnectButton.count() > 0) {
            console.log(`${provider} is connected`);
            config.connected = true;
          } else if (await connectButton.count() > 0) {
            console.log(`${provider} is not connected`);
            
            // Could test connection flow
            // await connectButton.click();
            // Would redirect to OAuth provider
          }
        }
      }
    }
  });

  test('API keys and developer settings', async ({ page }) => {
    // Developer section might be hidden or require special access
    const developerTab = page.locator('button:has-text("開発者"), a:has-text("Developer"), a:has-text("API")');
    
    if (await developerTab.count() > 0) {
      await developerTab.click();
      
      const apiSection = page.locator('.api-section, [data-testid="api-keys"]');
      await expect(apiSection).toBeVisible();
      
      // Existing API keys
      const apiKeysList = apiSection.locator('.api-key-item');
      const keyCount = await apiKeysList.count();
      
      console.log(`Found ${keyCount} API keys`);
      
      // Create new API key
      const createKeyButton = apiSection.locator('button:has-text("新規作成"), button:has-text("Create")');
      if (await createKeyButton.count() > 0) {
        await createKeyButton.click();
        
        // API key creation modal
        const keyModal = page.locator('.api-key-modal, [role="dialog"]');
        await expect(keyModal).toBeVisible();
        
        // Key name
        const keyNameInput = keyModal.locator('input[name="keyName"]');
        await keyNameInput.fill('Test API Key');
        
        // Permissions/scopes
        const scopes = {
          readProfile: keyModal.locator('input[name="scopeReadProfile"]'),
          readChats: keyModal.locator('input[name="scopeReadChats"]'),
          writeChats: keyModal.locator('input[name="scopeWriteChats"]'),
          readPurchases: keyModal.locator('input[name="scopeReadPurchases"]')
        };
        
        // Select some scopes
        for (const [scope, checkbox] of Object.entries(scopes)) {
          if (await checkbox.count() > 0) {
            await checkbox.check();
          }
        }
        
        // Cancel creation for safety
        await keyModal.locator('button:has-text("キャンセル")').click();
      }
      
      // View existing key details
      if (keyCount > 0) {
        const firstKey = apiKeysList.first();
        
        // Key info
        const keyName = await firstKey.locator('.key-name').textContent();
        const lastUsed = await firstKey.locator('.last-used').textContent();
        
        console.log(`API Key: ${keyName}, Last used: ${lastUsed}`);
        
        // Revoke option
        const revokeButton = firstKey.locator('button:has-text("無効化"), button:has-text("Revoke")');
        if (await revokeButton.count() > 0) {
          console.log('Can revoke API keys');
        }
      }
    }
  });

  test('Account verification status', async ({ page }) => {
    // Verification section
    const verificationSection = page.locator('.verification-section, [data-testid="verification-status"]');
    
    if (await verificationSection.count() > 0) {
      // Email verification
      const emailVerification = verificationSection.locator('.email-verification');
      if (await emailVerification.count() > 0) {
        const isVerified = await emailVerification.locator('.verified, :has-text("確認済み")').count() > 0;
        
        if (isVerified) {
          console.log('Email is verified');
          await expect(emailVerification.locator('.check-icon, .verified-badge')).toBeVisible();
        } else {
          console.log('Email not verified');
          
          // Resend verification option
          const resendButton = emailVerification.locator('button:has-text("再送信"), button:has-text("Resend")');
          if (await resendButton.count() > 0) {
            await resendButton.click();
            await expect(page.locator(':has-text("送信しました"), :has-text("Sent")')).toBeVisible();
          }
        }
      }
      
      // Phone verification (if implemented)
      const phoneVerification = verificationSection.locator('.phone-verification');
      if (await phoneVerification.count() > 0) {
        const phoneVerified = await phoneVerification.locator('.verified').count() > 0;
        console.log('Phone verification:', phoneVerified ? 'Verified' : 'Not verified');
      }
      
      // Identity verification (if required)
      const identityVerification = verificationSection.locator('.identity-verification');
      if (await identityVerification.count() > 0) {
        const idVerified = await identityVerification.locator('.verified').count() > 0;
        
        if (!idVerified) {
          const startVerificationButton = identityVerification.locator('button:has-text("開始"), button:has-text("Start")');
          console.log('Identity verification available');
        }
      }
    }
  });

  test('Billing and payment methods', async ({ page }) => {
    // Billing section
    const billingTab = page.locator('button:has-text("支払い"), a:has-text("Billing")');
    if (await billingTab.count() > 0) {
      await billingTab.click();
      
      const billingSection = page.locator('.billing-section, [data-testid="billing"]');
      await expect(billingSection).toBeVisible();
      
      // Payment methods
      const paymentMethods = billingSection.locator('.payment-method-item');
      const methodCount = await paymentMethods.count();
      
      console.log(`Found ${methodCount} payment methods`);
      
      if (methodCount > 0) {
        // Check first payment method
        const firstMethod = paymentMethods.first();
        
        // Card details (masked)
        const cardInfo = await firstMethod.locator('.card-info, :has-text("****")').textContent();
        console.log('Payment method:', cardInfo);
        
        // Default indicator
        const isDefault = await firstMethod.locator('.default-badge, :has-text("デフォルト")').count() > 0;
        if (isDefault) {
          console.log('This is the default payment method');
        }
        
        // Actions
        const editButton = firstMethod.locator('button:has-text("編集"), button:has-text("Edit")');
        const removeButton = firstMethod.locator('button:has-text("削除"), button:has-text("Remove")');
        
        expect(await editButton.count() + await removeButton.count()).toBeGreaterThan(0);
      }
      
      // Add payment method
      const addPaymentButton = billingSection.locator('button:has-text("支払い方法を追加"), button:has-text("Add payment")');
      if (await addPaymentButton.count() > 0) {
        console.log('Can add new payment methods');
      }
      
      // Billing history
      const historyLink = billingSection.locator('a:has-text("請求履歴"), a:has-text("Billing history")');
      if (await historyLink.count() > 0) {
        await historyLink.click();
        await page.waitForURL(/billing|history/);
        
        // Should show past transactions
        const transactions = page.locator('.transaction-item, tr.billing-row');
        const transactionCount = await transactions.count();
        console.log(`Found ${transactionCount} transactions`);
      }
    }
  });

  test('Account limits and usage', async ({ page }) => {
    // Usage section
    const usageSection = page.locator('.usage-section, [data-testid="usage-limits"]');
    
    if (await usageSection.count() > 0) {
      // Daily/monthly limits
      const limits = {
        dailyChats: usageSection.locator(':has-text("日次チャット"), :has-text("Daily chats")'),
        monthlyTokens: usageSection.locator(':has-text("月間トークン"), :has-text("Monthly tokens")'),
        storageUsed: usageSection.locator(':has-text("ストレージ"), :has-text("Storage")'),
        apiCalls: usageSection.locator(':has-text("API呼び出し"), :has-text("API calls")')
      };
      
      for (const [limit, locator] of Object.entries(limits)) {
        if (await locator.count() > 0) {
          const usageText = await locator.textContent();
          
          // Should show current/max format
          if (usageText?.includes('/')) {
            const [current, max] = usageText.split('/').map(s => parseInt(s.replace(/[^0-9]/g, '')));
            console.log(`${limit}: ${current}/${max}`);
            
            // Check if near limit
            if (current / max > 0.8) {
              console.log(`Warning: ${limit} is near limit`);
              
              // Might show upgrade prompt
              const upgradePrompt = locator.locator('~ .upgrade-prompt, ~ :has-text("アップグレード")');
              if (await upgradePrompt.count() > 0) {
                console.log('Upgrade prompt shown');
              }
            }
          }
        }
      }
    }
  });

  test('Referral program', async ({ page }) => {
    // Referral section
    const referralSection = page.locator('.referral-section, [data-testid="referral-program"]');
    
    if (await referralSection.count() > 0) {
      // Referral code
      const referralCode = referralSection.locator('.referral-code, code');
      if (await referralCode.count() > 0) {
        const code = await referralCode.textContent();
        console.log('Referral code:', code);
        
        // Copy button
        const copyButton = referralSection.locator('button:has-text("コピー"), button:has-text("Copy")');
        await copyButton.click();
        
        await expect(page.locator(':has-text("コピーしました")')).toBeVisible();
      }
      
      // Referral stats
      const stats = {
        totalReferrals: referralSection.locator(':has-text("紹介人数"), :has-text("Total referrals")'),
        activeReferrals: referralSection.locator(':has-text("アクティブ"), :has-text("Active")'),
        earnings: referralSection.locator(':has-text("報酬"), :has-text("Earnings")')
      };
      
      for (const [stat, locator] of Object.entries(stats)) {
        if (await locator.count() > 0) {
          const value = await locator.textContent();
          console.log(`${stat}: ${value}`);
        }
      }
      
      // Share options
      const shareButtons = {
        twitter: referralSection.locator('button:has-text("Twitter"), button[aria-label*="Twitter"]'),
        line: referralSection.locator('button:has-text("LINE"), button[aria-label*="LINE"]'),
        email: referralSection.locator('button:has-text("メール"), button[aria-label*="Email"]')
      };
      
      for (const [platform, button] of Object.entries(shareButtons)) {
        if (await button.count() > 0) {
          console.log(`Can share via ${platform}`);
        }
      }
    }
  });

  test('Account badges and achievements overview', async ({ page }) => {
    // Achievements section in profile
    const achievementsSection = page.locator('.achievements-overview, [data-testid="achievements-overview"]');
    
    if (await achievementsSection.count() > 0) {
      // Total achievements
      const totalAchievements = achievementsSection.locator(':has-text("実績"), :has-text("Achievements")');
      if (await totalAchievements.count() > 0) {
        const total = await totalAchievements.textContent();
        console.log('Achievements:', total);
      }
      
      // Featured badges
      const badges = await achievementsSection.locator('.badge-item, .achievement-badge').all();
      
      for (const badge of badges.slice(0, 3)) {
        const title = await badge.getAttribute('title') || await badge.textContent();
        console.log('Badge:', title);
      }
      
      // View all link
      const viewAllLink = achievementsSection.locator('a:has-text("すべて見る"), a:has-text("View all")');
      if (await viewAllLink.count() > 0) {
        await viewAllLink.click();
        await page.waitForURL(/achievements/);
        
        // Should show full achievements page
        await expect(page.locator('h1:has-text("実績"), h1:has-text("Achievements")')).toBeVisible();
      }
    }
  });
});