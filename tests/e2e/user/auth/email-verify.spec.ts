import { test, expect } from '@playwright/test';

test.describe('Email Verification', () => {
  test('Email verification success flow', async ({ page }) => {
    // Simulate clicking verification link from email
    const validToken = 'valid-test-token-123';
    await page.goto(`/api/v1/auth/verify-email?token=${validToken}&locale=ja`);
    
    // Should show success message
    await expect(page.locator(':has-text("認証が完了"), :has-text("verified successfully")')).toBeVisible();
    
    // Should have link to setup page
    await expect(page.locator('a[href*="/setup"], button:has-text("セットアップ")')).toBeVisible();
    
    // Auto redirect after 3 seconds or click button
    await page.click('a:has-text("セットアップ"), button:has-text("セットアップ")');
    await expect(page).toHaveURL(/setup/);
  });

  test('Email verification with expired token', async ({ page }) => {
    const expiredToken = 'expired-token-123';
    await page.goto(`/api/v1/auth/verify-email?token=${expiredToken}&locale=ja`);
    
    // Should show error message
    await expect(page.locator(':has-text("期限切れ"), :has-text("expired")')).toBeVisible();
    
    // Should have link to resend email
    await expect(page.locator('a:has-text("再送信"), button:has-text("再送信")')).toBeVisible();
  });

  test('Email verification with invalid token', async ({ page }) => {
    const invalidToken = 'invalid-token-xyz';
    await page.goto(`/api/v1/auth/verify-email?token=${invalidToken}&locale=ja`);
    
    // Should show error message
    await expect(page.locator(':has-text("無効"), :has-text("invalid")')).toBeVisible();
  });

  test('Already verified email handling', async ({ page }) => {
    // Simulate clicking verification link again
    const usedToken = 'already-used-token';
    await page.goto(`/api/v1/auth/verify-email?token=${usedToken}&locale=ja`);
    
    // Should show appropriate message
    await expect(page.locator(':has-text("既に認証"), :has-text("already verified")')).toBeVisible();
    
    // Should redirect to setup or dashboard
    await expect(page.locator('a[href*="/setup"], a[href*="/dashboard"]')).toBeVisible();
  });

  test('Email verification page in English', async ({ page }) => {
    const validToken = 'valid-test-token-456';
    await page.goto(`/api/v1/auth/verify-email?token=${validToken}&locale=en`);
    
    // Should show English messages
    await expect(page.locator(':has-text("verified successfully"), :has-text("Email Verified")')).toBeVisible();
  });

  test('Email verification saves user data to localStorage', async ({ page }) => {
    const validToken = 'valid-test-token-789';
    
    // Clear localStorage first
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    
    // Visit verification link
    await page.goto(`/api/v1/auth/verify-email?token=${validToken}&locale=ja`);
    
    // Wait for success message
    await expect(page.locator(':has-text("認証が完了")')).toBeVisible();
    
    // Check localStorage for user data
    const userData = await page.evaluate(() => {
      return {
        user: localStorage.getItem('user'),
        token: localStorage.getItem('token'),
        refreshToken: localStorage.getItem('refreshToken')
      };
    });
    
    // Should have stored authentication data
    expect(userData.user).toBeTruthy();
    expect(userData.token).toBeTruthy();
  });

  test('Resend verification email', async ({ page }) => {
    // Go to resend page
    await page.goto('/resend-verification');
    
    // Enter email
    await page.fill('input[name="email"]', 'unverified@example.com');
    await page.click('button:has-text("再送信"), button:has-text("Resend")');
    
    // Should show success message
    await expect(page.locator('.toast-success, :has-text("送信しました")')).toBeVisible();
  });

  test('Email verification link format compatibility', async ({ page }) => {
    // Test old format (without /v1)
    const token = 'backward-compat-token';
    await page.goto(`/api/auth/verify-email?token=${token}`);
    
    // Should redirect to new format
    await expect(page).toHaveURL(/\/api\/v1\/auth\/verify-email/);
  });
});