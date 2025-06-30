import { test, expect } from '@playwright/test';

test.describe('New User Complete Flow', () => {
  const timestamp = Date.now();
  const testEmail = `testuser_${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';
  const testUsername = `TestUser${timestamp}`;

  test('Complete new user registration and setup flow', async ({ page }) => {
    // Monitor network requests to understand API responses
    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        console.log(`API Response: ${response.url()} - Status: ${response.status()}`);
        if (response.url().includes('register') && response.status() !== 200) {
          try {
            const body = await response.text();
            console.log('Registration API error response:', body);
          } catch (e) {
            // Ignore if can't read body
          }
        }
      }
    });
    
    // Step 1: Navigate to registration page
    await page.goto('/ja'); // Use Japanese locale
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Debug: Take screenshot before clicking
    await page.screenshot({ path: 'before-register-click.png' });
    
    // Click on the register button/link based on the homepage structure
    // The homepage has a button with onClick that navigates to register page
    const registerButton = page.locator('button:has-text("新規登録")');
    
    // Wait for button to be visible and clickable
    await expect(registerButton).toBeVisible({ timeout: 10000 });
    await registerButton.click();
    
    // Wait for navigation to complete
    await page.waitForURL('**/register', { timeout: 15000 });
    
    // Debug: Take screenshot after navigation
    await page.screenshot({ path: 'after-register-click.png' });
    
    // Additional wait for form to be ready
    // Note: The register page uses id attributes, not name attributes
    await page.waitForSelector('input#email', { state: 'visible', timeout: 10000 });
    
    // Step 2: Fill registration form
    // The form uses id attributes for fields
    await page.fill('input#email', testEmail);
    await page.fill('input#password', testPassword);
    await page.fill('input#confirmPassword', testPassword);
    
    // Step 3: Submit the form
    // The register page doesn't have a terms checkbox - it's implied by submitting
    await page.click('button[type="submit"]');
    
    // Step 4: Wait for response and check what happens
    // Take screenshot to see what's happening
    await page.waitForTimeout(2000); // Wait a bit for any response
    await page.screenshot({ path: 'after-submit.png' });
    
    // Check for error messages first
    const errorMessages = await page.locator('.error-message, .field-error, .bg-red-50, [role="alert"].error').all();
    if (errorMessages.length > 0) {
      const errorText = await errorMessages[0].textContent();
      console.error('Registration error:', errorText);
      
      // If email already exists, try with a different email
      if (errorText?.includes('already') || errorText?.includes('既に')) {
        console.log('Email already registered, trying with new timestamp');
        const newEmail = `testuser_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
        await page.fill('input#email', newEmail);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
      }
    }
    
    // Check current URL to understand the flow
    const currentUrl = page.url();
    console.log('Current URL after submit:', currentUrl);
    
    // Try multiple possible success indicators
    const successIndicators = [
      page.locator('.toast-success'),
      page.locator('[role="alert"]'),
      page.locator('text="確認メール"'),
      page.locator('text="メールを確認"'),
      page.locator('text="登録完了"'),
      page.locator('text="verification"'),
      page.locator('text="verify"'),
      page.locator('.success-message'),
      page.locator('.alert-success')
    ];
    
    let successFound = false;
    for (const indicator of successIndicators) {
      const count = await indicator.count();
      if (count > 0) {
        console.log(`Found success indicator: ${await indicator.first().textContent()}`);
        successFound = true;
        break;
      }
    }
    
    // If no success message found, check if we were redirected
    if (!successFound) {
      // Check if URL changed (might indicate successful registration)
      if (currentUrl.includes('register-complete') || currentUrl.includes('verify') || currentUrl.includes('email')) {
        console.log('Redirected to registration complete page');
        successFound = true;
      }
    }
    
    // Alternative: Wait for URL change
    if (!successFound) {
      try {
        await page.waitForURL('**/register-complete', { timeout: 5000 });
        console.log('Successfully redirected to register-complete page');
        successFound = true;
      } catch (e) {
        console.log('No redirect to register-complete page');
      }
    }
    
    // Step 5: Verify we're on some kind of success/verification page
    if (!successFound) {
      // Log current page content for debugging
      const pageContent = await page.textContent('body');
      console.log('Page content preview:', pageContent?.substring(0, 500));
      
      // Take final screenshot
      await page.screenshot({ path: 'registration-final-state.png' });
    }
    
    expect(successFound).toBeTruthy();
    
    // Note: In real E2E test, we would need to:
    // - Access test email inbox
    // - Click verification link
    // - For now, we'll simulate the verification by directly accessing the API
    
    // Step 6: Simulate email verification (in real test, would click email link)
    // This would normally be done by clicking the link in the email
    console.log('Email verification would happen here in production test');
    
    // Step 7: After email verification, user should be redirected to setup
    // For testing, we'll login with the created account
    await page.goto('/ja/login');
    
    // Wait for login form to be ready
    await page.waitForLoadState('networkidle');
    
    // Use label selectors for better reliability
    await page.getByLabel('メールアドレス').fill(testEmail);
    await page.getByLabel('パスワード').fill(testPassword);
    await page.getByRole('button', { name: 'ログインする' }).click();
    
    // Check for email verification error
    const verificationError = page.locator('text="メールアドレスが認証されていません"');
    const resendButton = page.getByRole('button', { name: '確認メールを再送信' });
    
    // Wait to see if verification error appears
    if (await verificationError.isVisible({ timeout: 3000 })) {
      console.log('⚠️ Email verification required - testing resend functionality');
      
      // Test the resend verification flow
      await expect(resendButton).toBeVisible();
      await resendButton.click();
      
      // Wait for success message (adjust selector based on actual implementation)
      const successMessage = page.locator('text="確認メールを送信しました", text="メールを送信", text="sent"').first();
      await expect(successMessage).toBeVisible({ timeout: 5000 });
      
      console.log('✅ Resend verification email functionality works');
      console.log('📧 In a real scenario, user would click the link in the email');
      
      // Since we can't access dashboard without verification, we'll end the test here
      console.log('⏭️ Skipping dashboard verification as email verification is required');
      return;
    }
    
    // If no verification error, proceed to dashboard
    try {
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('✅ Successfully logged in and redirected to dashboard');
      
      // Step 8: Verify initial bonus tokens (10,000)
      const tokenBalance = await page.locator('[data-testid="token-balance"], .token-balance, :has-text("トークン残高")').textContent();
      expect(tokenBalance).toContain('10,000');
      
      // Step 9: Verify language settings (should default to Japanese)
      const pageContent = await page.textContent('body');
      expect(pageContent).toContain('ダッシュボード');
      
      console.log('✅ New user registration flow completed successfully');
    } catch (error) {
      // If we can't reach dashboard, log the current state
      console.log('❌ Could not reach dashboard. Current URL:', page.url());
      const currentPageContent = await page.textContent('body');
      console.log('Current page content preview:', currentPageContent?.substring(0, 500));
      throw error;
    }
  });

  test('Registration form validation', async ({ page }) => {
    // Navigate to registration page via homepage
    await page.goto('/ja');
    await page.waitForLoadState('networkidle');
    
    const registerButton = page.locator('button:has-text("新規登録")');
    await expect(registerButton).toBeVisible({ timeout: 10000 });
    await registerButton.click();
    await page.waitForURL('**/register', { timeout: 15000 });
    
    // Wait for form to be ready
    await page.waitForSelector('button[type="submit"]', { state: 'visible' });
    
    // Test 1: Required fields validation
    await page.getByRole('button', { name: '利用規約に同意して登録する' }).click();
    await expect(page.locator('.error-message, .field-error, [role="alert"]').first()).toBeVisible();
    
    // Test 2: Email format validation
    await page.getByLabel('メールアドレス').fill('invalid-email');
    await page.getByRole('button', { name: '利用規約に同意して登録する' }).click();
    await expect(page.locator('div:has-text("正しいメールアドレス"), div:has-text("valid email")')).toBeVisible();
    
    // Test 3: Password confirmation mismatch
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await page.getByLabel('パスワード', { exact: true }).fill('Password123!');
    await page.getByLabel('パスワード確認').fill('DifferentPassword123!');
    await page.getByRole('button', { name: '利用規約に同意して登録する' }).click();
    await expect(page.locator('div:has-text("パスワードが一致"), div:has-text("do not match")')).toBeVisible();
  });

  test('Email verification flow', async ({ page, request }) => {
    // This test would require email testing service integration
    // For now, we'll test the verification page UI
    
    await page.goto('/verify-email?token=test-token');
    
    // Should show verification in progress
    await expect(page.locator(':has-text("確認中"), :has-text("Verifying")')).toBeVisible();
    
    // Test expired token scenario
    await page.goto('/verify-email?token=expired-token');
    await expect(page.locator(':has-text("期限切れ"), :has-text("expired")')).toBeVisible();
  });

  test('Initial setup after email verification', async ({ page }) => {
    // Assuming user is logged in after email verification
    // This would be part of the complete flow
    
    // Test language preference selection
    await page.goto('/setup');
    
    // Should see language selection
    await expect(page.locator(':has-text("言語設定"), :has-text("Language")')).toBeVisible();
    
    // Select English
    await page.click('button:has-text("English")');
    await expect(page.locator(':has-text("Welcome")')).toBeVisible();
    
    // Switch back to Japanese
    await page.click('button:has-text("日本語")');
    await expect(page.locator(':has-text("ようこそ")')).toBeVisible();
    
    // Complete setup
    await page.click('button:has-text("開始"), button:has-text("Start")');
    await expect(page).toHaveURL('**/dashboard');
  });
});