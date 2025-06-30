import { test, expect } from '@playwright/test';

test.describe('New User Complete Flow', () => {
  const timestamp = Date.now();
  const testEmail = `testuser_${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';
  const testUsername = `TestUser${timestamp}`;

  test('Complete new user registration and setup flow', async ({ page }) => {
    // Step 1: Navigate to registration page
    await page.goto('/ja'); // Use Japanese locale
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Click on the register button/link based on the homepage structure
    // The homepage has a button with onClick that navigates to register page
    await page.click('button:has-text("新規登録")');
    await page.waitForURL('**/register');
    
    // Step 2: Fill registration form
    await page.fill('input[name="username"]', testUsername);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    
    // Step 3: Accept terms and submit
    await page.check('input[name="agreeToTerms"]');
    await page.click('button[type="submit"]:has-text("登録")');
    
    // Step 4: Verify registration success message
    await expect(page.locator('.toast-success, [role="alert"]:has-text("確認メール")')).toBeVisible({ timeout: 10000 });
    
    // Step 5: Check for email verification page redirect
    await expect(page).toHaveURL(/email-sent|verify-email|check-email/, { timeout: 5000 });
    
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
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Step 8: Verify initial bonus tokens (10,000)
    await page.waitForURL('**/dashboard');
    const tokenBalance = await page.locator('[data-testid="token-balance"], .token-balance, :has-text("トークン残高")').textContent();
    expect(tokenBalance).toContain('10,000');
    
    // Step 9: Verify language settings (should default to Japanese)
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('ダッシュボード');
    
    console.log('✅ New user registration flow completed successfully');
  });

  test('Registration form validation', async ({ page }) => {
    await page.goto('/ja/register');
    
    // Test 1: Required fields validation
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message, .field-error').first()).toBeVisible();
    
    // Test 2: Email format validation
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-error="email"], .email-error')).toBeVisible();
    
    // Test 3: Password confirmation mismatch
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    await page.click('button[type="submit"]');
    await expect(page.locator(':has-text("パスワードが一致"), :has-text("do not match")')).toBeVisible();
    
    // Test 4: Terms agreement required
    await page.fill('input[name="confirmPassword"]', 'Password123!');
    await page.uncheck('input[name="agreeToTerms"]');
    await page.click('button[type="submit"]');
    await expect(page.locator(':has-text("利用規約"), :has-text("terms")')).toBeVisible();
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