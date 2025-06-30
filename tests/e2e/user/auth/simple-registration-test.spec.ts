import { test, expect } from '@playwright/test';

test.describe('Simple Registration Test', () => {
  test('Can navigate to registration page and see form', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/ja');
    
    // Click register button
    const registerButton = page.locator('button:has-text("新規登録")');
    await expect(registerButton).toBeVisible();
    await registerButton.click();
    
    // Verify we're on registration page
    await expect(page).toHaveURL(/register/);
    
    // Verify form fields exist
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('input#confirmPassword')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    console.log('✅ Registration form is accessible');
  });
  
  test('Submit registration with unique email', async ({ page }) => {
    // Use very unique email
    const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substring(2, 15)}@example.com`;
    const password = 'TestPass123!';
    
    console.log('Testing with email:', uniqueEmail);
    
    // Go directly to registration page
    await page.goto('/ja/register');
    
    // Fill form
    await page.fill('input#email', uniqueEmail);
    await page.fill('input#password', password);
    await page.fill('input#confirmPassword', password);
    
    // Monitor console for errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for any response
    await page.waitForTimeout(5000);
    
    // Check final state
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);
    
    // Take screenshot
    await page.screenshot({ path: 'simple-registration-result.png', fullPage: true });
    
    // Check if still on register page (indicates error)
    if (finalUrl.includes('/register') && !finalUrl.includes('complete')) {
      // Look for error message
      const errorElement = page.locator('.bg-red-50, .error-message, [role="alert"]').first();
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        console.log('Error message found:', errorText);
      }
      
      // Get all visible text to understand what happened
      const visibleText = await page.locator('body').textContent();
      console.log('Page text (first 1000 chars):', visibleText?.substring(0, 1000));
    }
    
    // Success if we navigated away from register page
    expect(finalUrl).not.toMatch(/\/register$/);
  });
});