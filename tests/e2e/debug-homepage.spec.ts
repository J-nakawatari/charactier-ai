import { test, expect } from '@playwright/test';

test.describe('Homepage Debug', () => {
  test('Debug homepage structure and find registration button', async ({ page }) => {
    // Try Japanese locale first
    console.log('=== Testing Japanese locale (/ja) ===');
    await page.goto('/ja');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'homepage-ja-debug.png', fullPage: true });
    
    // Log current URL
    console.log('Current URL:', page.url());
    
    // Check for the new user promo button
    console.log('\n--- Checking for registration elements ---');
    
    // Based on the homepage code, the registration button text is in translations
    const registrationSelectors = [
      'button:has-text("初回限定")',
      'button:has-text("新規登録")',
      'button:has-text("初回登録")',
      'button[onclick*="register"]',
      ':has-text("初回限定！新規登録で")',
      ':has-text("新規登録で10,000トークンGET")'
    ];
    
    for (const selector of registrationSelectors) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`✓ Found "${selector}": ${count} element(s)`);
          const element = page.locator(selector).first();
          const text = await element.textContent();
          console.log(`  Full text: "${text}"`);
          
          // Try to get parent element info
          const parent = element.locator('..');
          const parentTag = await parent.evaluate(el => el.tagName);
          console.log(`  Parent tag: ${parentTag}`);
        } else {
          console.log(`✗ Not found: "${selector}"`);
        }
      } catch (e) {
        console.log(`✗ Error checking "${selector}":`, e.message);
      }
    }
    
    // Check the actual new user promo section
    console.log('\n--- Checking new user promo section ---');
    const promoSection = page.locator('.text-center.mt-8');
    if (await promoSection.count() > 0) {
      console.log('Found promo section');
      const promoText = await promoSection.textContent();
      console.log('Promo section text:', promoText);
      
      // Check for clickable elements in promo section
      const clickableElements = await promoSection.locator('button, a').all();
      console.log(`Found ${clickableElements.length} clickable elements in promo section`);
      
      for (let i = 0; i < clickableElements.length; i++) {
        const el = clickableElements[i];
        const tag = await el.evaluate(e => e.tagName);
        const text = await el.textContent();
        const onclick = await el.getAttribute('onclick');
        console.log(`  ${i + 1}. <${tag}> "${text}" onclick="${onclick}"`);
      }
    }
    
    // List all buttons on the page
    console.log('\n--- All buttons on page ---');
    const allButtons = await page.locator('button').all();
    for (let i = 0; i < allButtons.length; i++) {
      const button = allButtons[i];
      const text = await button.textContent();
      const isVisible = await button.isVisible();
      console.log(`${i + 1}. "${text?.trim()}" (visible: ${isVisible})`);
    }
    
    // Try English locale
    console.log('\n\n=== Testing English locale (/en) ===');
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'homepage-en-debug.png', fullPage: true });
    
    // Check for English registration elements
    const englishSelectors = [
      'button:has-text("Sign up")',
      'button:has-text("Register")',
      'button:has-text("Get started")',
      ':has-text("Sign up and get")',
      ':has-text("10,000 tokens")'
    ];
    
    for (const selector of englishSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✓ Found "${selector}": ${count} element(s)`);
      }
    }
  });
});