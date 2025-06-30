import { test, expect } from '@playwright/test';

test.describe('Debug Navigation', () => {
  test('Check homepage and navigation', async ({ page }) => {
    console.log('=== Starting navigation debug ===');
    
    // 1. Go to homepage
    await page.goto('/ja');
    console.log('1. Current URL:', page.url());
    
    // 2. Take screenshot
    await page.screenshot({ path: 'homepage.png' });
    
    // 3. Check what's on the page
    const pageTitle = await page.title();
    console.log('2. Page title:', pageTitle);
    
    // 4. Look for any buttons
    const buttons = await page.locator('button').all();
    console.log(`3. Found ${buttons.length} buttons on page`);
    
    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent();
      console.log(`   Button ${i + 1}: "${text}"`);
    }
    
    // 5. Look for links
    const links = await page.locator('a').all();
    console.log(`4. Found ${links.length} links on page`);
    
    for (let i = 0; i < Math.min(5, links.length); i++) {
      const text = await links[i].textContent();
      const href = await links[i].getAttribute('href');
      console.log(`   Link ${i + 1}: "${text}" -> ${href}`);
    }
    
    // 6. Check if page loaded correctly
    const bodyText = await page.locator('body').textContent();
    if (bodyText?.includes('404') || bodyText?.includes('Error')) {
      console.log('⚠️ Page might have error:', bodyText.substring(0, 200));
    }
    
    // 7. Try direct navigation to register
    console.log('\n=== Testing direct navigation ===');
    await page.goto('/ja/register');
    console.log('5. Register page URL:', page.url());
    
    const registerPageTitle = await page.title();
    console.log('6. Register page title:', registerPageTitle);
    
    // Check if form exists
    const emailInput = await page.locator('input[type="email"]').count();
    const passwordInput = await page.locator('input[type="password"]').count();
    console.log('7. Form inputs found:', { email: emailInput, password: passwordInput });
  });
});