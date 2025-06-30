import { test, expect } from '@playwright/test';

test.describe('User Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('Successful registration with all required fields', async ({ page }) => {
    const timestamp = Date.now();
    const testData = {
      username: `TestUser${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: 'SecurePassword123!',
    };

    // Fill form
    await page.fill('input[name="username"]', testData.username);
    await page.fill('input[name="email"]', testData.email);
    await page.fill('input[name="password"]', testData.password);
    await page.fill('input[name="confirmPassword"]', testData.password);
    await page.check('input[name="agreeToTerms"]');
    
    // Submit
    await page.click('button[type="submit"]:has-text("登録")');
    
    // Verify success
    await expect(page.locator('.toast-success, [role="alert"]:has-text("成功")')).toBeVisible();
    
    // Should redirect to email verification notice
    await expect(page).toHaveURL(/email-sent|verify-email|check-email/);
  });

  test('Form validation - required fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for required field errors
    const errors = page.locator('.error-message, .field-error, [role="alert"]');
    await expect(errors).toHaveCount(5); // username, email, password, confirmPassword, terms
  });

  test('Email format validation', async ({ page }) => {
    const invalidEmails = [
      'notanemail',
      'missing@domain',
      '@nodomain.com',
      'spaces in@email.com',
      'double@@domain.com'
    ];

    for (const email of invalidEmails) {
      await page.fill('input[name="email"]', email);
      await page.click('button[type="submit"]');
      await expect(page.locator('[data-error="email"], .email-error, :has-text("有効なメールアドレス")')).toBeVisible();
    }
  });

  test('Password validation rules', async ({ page }) => {
    // Test weak passwords
    const weakPasswords = [
      'short',          // Too short
      'alllowercase',   // No uppercase
      'ALLUPPERCASE',   // No lowercase
      'NoNumbers!',     // No numbers
      'NoSpecial123',   // No special characters
    ];

    for (const password of weakPasswords) {
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.click('button[type="submit"]');
      await expect(page.locator('.password-error, :has-text("パスワード")')).toBeVisible();
    }
  });

  test('Password confirmation match', async ({ page }) => {
    await page.fill('input[name="password"]', 'ValidPassword123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    await page.click('button[type="submit"]');
    
    await expect(page.locator(':has-text("一致"), :has-text("match")')).toBeVisible();
  });

  test('Terms agreement requirement', async ({ page }) => {
    // Fill all fields except terms
    await page.fill('input[name="username"]', 'TestUser');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');
    
    // Don't check terms
    await page.click('button[type="submit"]');
    
    await expect(page.locator(':has-text("利用規約"), :has-text("terms")')).toBeVisible();
  });

  test('Duplicate email handling', async ({ page }) => {
    // Use a known existing email
    await page.fill('input[name="username"]', 'NewUser');
    await page.fill('input[name="email"]', 'admin@example.com'); // Assuming this exists
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');
    await page.check('input[name="agreeToTerms"]');
    
    await page.click('button[type="submit"]');
    
    // Should show error about existing email
    await expect(page.locator(':has-text("既に登録"), :has-text("already registered")')).toBeVisible();
  });

  test('Initial bonus token display', async ({ page }) => {
    // After successful registration, should show 10,000 token bonus info
    await page.goto('/register');
    
    // Check if bonus is mentioned on registration page
    await expect(page.locator(':has-text("10,000"), :has-text("初回ボーナス")')).toBeVisible();
  });
});