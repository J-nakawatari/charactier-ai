import { test, expect } from '@playwright/test';

test.describe('Debug Registration Flow', () => {
  test('Debug registration page navigation', async ({ page }) => {
    console.log('=== Starting registration flow debug ===');
    
    // Step 1: Go to homepage
    console.log('1. Navigating to homepage...');
    await page.goto('/ja');
    await page.waitForLoadState('networkidle');
    console.log('   URL after navigation:', page.url());
    
    // Step 2: Find all buttons on the page
    console.log('\n2. Finding all buttons on homepage...');
    const allButtons = await page.locator('button').all();
    console.log(`   Found ${allButtons.length} buttons`);
    
    for (let i = 0; i < allButtons.length; i++) {
      const button = allButtons[i];
      const text = await button.textContent();
      const isVisible = await button.isVisible();
      console.log(`   Button ${i + 1}: "${text?.trim()}" (visible: ${isVisible})`);
    }
    
    // Step 3: Look for registration-related elements
    console.log('\n3. Looking for registration elements...');
    const registrationSelectors = [
      'button:has-text("新規登録")',
      'a:has-text("新規登録")',
      'button:has-text("登録")',
      'a[href*="register"]',
      ':has-text("初回限定")',
      ':has-text("10,000トークン")'
    ];
    
    for (const selector of registrationSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`   ✓ Found: ${selector} (${count} elements)`);
        const element = page.locator(selector).first();
        const tag = await element.evaluate(el => el.tagName);
        console.log(`     Tag: ${tag}`);
      } else {
        console.log(`   ✗ Not found: ${selector}`);
      }
    }
    
    // Step 4: Try to click registration button
    console.log('\n4. Attempting to click registration button...');
    const registerButton = page.locator('button:has-text("新規登録")');
    
    if (await registerButton.count() > 0) {
      console.log('   Registration button found, clicking...');
      await registerButton.click();
      
      // Wait a bit for navigation
      await page.waitForTimeout(2000);
      
      console.log('   URL after click:', page.url());
      console.log('   Page title:', await page.title());
      
      // Check if we're on registration page
      const hasUsernameField = await page.locator('input[name="username"]').count() > 0;
      const hasEmailField = await page.locator('input[name="email"]').count() > 0;
      console.log(`   Has username field: ${hasUsernameField}`);
      console.log(`   Has email field: ${hasEmailField}`);
      
      // List all input fields on the page
      console.log('\n5. Input fields on current page:');
      const inputs = await page.locator('input').all();
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const name = await input.getAttribute('name');
        const type = await input.getAttribute('type');
        const placeholder = await input.getAttribute('placeholder');
        console.log(`   Input ${i + 1}: name="${name}", type="${type}", placeholder="${placeholder}"`);
      }
    } else {
      console.log('   ❌ Registration button not found!');
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'homepage-no-register-button.png', fullPage: true });
      console.log('   Screenshot saved: homepage-no-register-button.png');
    }
  });
  
  test('Alternative registration navigation methods', async ({ page }) => {
    console.log('=== Testing alternative navigation methods ===');
    
    // Method 1: Direct URL navigation
    console.log('\n1. Testing direct URL navigation...');
    await page.goto('/ja/register');
    await page.waitForLoadState('networkidle');
    
    console.log('   URL:', page.url());
    console.log('   Has form:', await page.locator('form').count() > 0);
    console.log('   Has username field:', await page.locator('input[name="username"]').count() > 0);
    
    // Method 2: Try English locale
    console.log('\n2. Testing English locale...');
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    
    const englishButtons = await page.locator('button').all();
    console.log(`   Found ${englishButtons.length} buttons in English version`);
    
    for (const button of englishButtons) {
      const text = await button.textContent();
      if (text?.toLowerCase().includes('register') || text?.toLowerCase().includes('sign up')) {
        console.log(`   Found registration button: "${text}"`);
      }
    }
  });
});