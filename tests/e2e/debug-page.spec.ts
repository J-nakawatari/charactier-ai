import { test, expect } from '@playwright/test';

test.describe('Debug Page Structure', () => {
  test('Check homepage elements', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'homepage-debug.png', fullPage: true });
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Log page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Log all visible text
    const bodyText = await page.locator('body').textContent();
    console.log('Page text preview:', bodyText?.substring(0, 500));
    
    // Check for common registration links
    const possibleSelectors = [
      'a:has-text("新規登録")',
      'a:has-text("Sign up")',
      'a:has-text("Register")',
      'button:has-text("新規登録")',
      'button:has-text("Sign up")',
      'a[href*="register"]',
      'a[href*="signup"]',
      '[data-testid="signup-link"]',
      '[data-testid="register-link"]'
    ];
    
    console.log('\nChecking for registration elements...');
    for (const selector of possibleSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✓ Found: ${selector} (${count} elements)`);
        const element = page.locator(selector).first();
        const text = await element.textContent();
        const href = await element.getAttribute('href');
        console.log(`  Text: ${text}`);
        console.log(`  Href: ${href}`);
      }
    }
    
    // Check all links
    console.log('\nAll links on page:');
    const links = await page.locator('a').all();
    for (let i = 0; i < Math.min(10, links.length); i++) {
      const link = links[i];
      const text = await link.textContent();
      const href = await link.getAttribute('href');
      console.log(`${i + 1}. "${text}" -> ${href}`);
    }
    
    // Check all buttons
    console.log('\nAll buttons on page:');
    const buttons = await page.locator('button').all();
    for (let i = 0; i < Math.min(10, buttons.length); i++) {
      const button = buttons[i];
      const text = await button.textContent();
      console.log(`${i + 1}. "${text}"`);
    }
    
    // Check if we're on login page
    const isLoginPage = await page.locator('input[type="email"], input[name="email"]').count() > 0;
    console.log('\nIs this a login page?', isLoginPage);
    
    // Check language/locale
    const url = page.url();
    console.log('\nCurrent URL:', url);
    
    // Check for locale in URL
    if (url.includes('/ja/') || url.includes('/en/')) {
      console.log('Locale detected in URL');
    }
  });
});