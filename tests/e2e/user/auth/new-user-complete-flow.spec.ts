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
    
    // Wait for login form to be ready
    await page.waitForSelector('input#email', { state: 'visible' });
    
    await page.fill('input#email', testEmail);
    await page.fill('input#password', testPassword);
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
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message, .field-error, [role="alert"]').first()).toBeVisible();
    
    // Test 2: Email format validation
    await page.fill('input#email', 'invalid-email');
    await page.click('button[type="submit"]');
    await expect(page.locator('div:has-text("正しいメールアドレス"), div:has-text("valid email")')).toBeVisible();
    
    // Test 3: Password confirmation mismatch
    await page.fill('input#email', 'test@example.com');
    await page.fill('input#password', 'Password123!');
    await page.fill('input#confirmPassword', 'DifferentPassword123!');
    await page.click('button[type="submit"]');
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