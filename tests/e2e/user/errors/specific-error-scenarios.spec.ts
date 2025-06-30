import { test, expect } from '@playwright/test';

test.describe('Specific Error Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Login for authenticated tests
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('Session expiration handling', async ({ page, context }) => {
    // Simulate session expiration by clearing cookies
    await page.goto('/dashboard');
    
    // Clear auth cookies to simulate expiration
    await context.clearCookies();
    
    // Try to perform an authenticated action
    await page.click('a:has-text("キャラクター"), a:has-text("Characters")');
    
    // Should redirect to login with message
    await expect(page).toHaveURL(/login/);
    
    // Should show session expired message
    await expect(page.locator(
      ':has-text("セッションが期限切れ"), ' +
      ':has-text("Session expired"), ' +
      ':has-text("再度ログイン")'
    )).toBeVisible();
    
    // Should preserve return URL
    const urlParams = new URL(page.url()).searchParams;
    const returnUrl = urlParams.get('return') || urlParams.get('redirect');
    if (returnUrl) {
      console.log('Return URL preserved:', returnUrl);
      
      // Login again
      await page.fill('input[name="email"]', 'testuser@example.com');
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
      
      // Should redirect back to intended page
      await expect(page).toHaveURL(/characters/);
    }
  });

  test('Rate limiting errors', async ({ page }) => {
    // Simulate hitting rate limit
    const requests = [];
    
    // Make rapid requests
    for (let i = 0; i < 10; i++) {
      requests.push(
        page.evaluate(() => 
          fetch('/api/v1/characters').then(r => ({ status: r.status }))
        )
      );
    }
    
    const results = await Promise.all(requests);
    
    // Check if any returned 429
    const rateLimited = results.some(r => r.status === 429);
    
    if (rateLimited) {
      console.log('Rate limit triggered');
      
      // UI should show rate limit message
      await page.goto('/characters');
      
      await expect(page.locator(
        ':has-text("リクエストが多すぎます"), ' +
        ':has-text("Too many requests"), ' +
        ':has-text("しばらくお待ちください")'
      )).toBeVisible();
      
      // Should show retry timer
      const retryTimer = page.locator(
        '.retry-timer, ' +
        '[data-testid="retry-timer"], ' +
        ':has-text("秒後に再試行")'
      );
      
      if (await retryTimer.count() > 0) {
        await expect(retryTimer).toBeVisible();
        
        // Timer should count down
        const initialTime = await retryTimer.textContent();
        await page.waitForTimeout(2000);
        const newTime = await retryTimer.textContent();
        
        expect(newTime).not.toBe(initialTime);
      }
    }
  });

  test('CORS and security errors', async ({ page }) => {
    // Monitor console for CORS errors
    const corsErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.text().includes('CORS') || msg.text().includes('Cross-Origin')) {
        corsErrors.push(msg.text());
      }
    });
    
    // Try to make cross-origin request
    await page.evaluate(() => {
      return fetch('https://external-api.example.com/data', {
        mode: 'cors'
      }).catch(err => err.message);
    });
    
    // Check for CSP violations
    page.on('console', msg => {
      if (msg.text().includes('Content Security Policy')) {
        console.log('CSP violation detected:', msg.text());
      }
    });
    
    // Try to inject unsafe script
    try {
      await page.evaluate(() => {
        const script = document.createElement('script');
        script.src = 'https://evil-site.com/malicious.js';
        document.head.appendChild(script);
      });
    } catch (error) {
      console.log('Script injection blocked (expected)');
    }
  });

  test('Database connection errors', async ({ page }) => {
    // Simulate database error
    await page.route('**/api/v1/**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Service Unavailable',
            message: 'データベース接続エラー',
            code: 'DB_CONNECTION_ERROR'
          })
        });
      } else {
        await route.continue();
      }
    });
    
    await page.goto('/characters');
    
    // Should show database error
    await expect(page.locator(
      ':has-text("データベース"), ' +
      ':has-text("Database"), ' +
      ':has-text("一時的な問題")'
    )).toBeVisible();
    
    // Should suggest checking status page
    const statusLink = page.locator('a:has-text("ステータス"), a:has-text("Status")');
    if (await statusLink.count() > 0) {
      console.log('Status page link provided');
    }
    
    await page.unroute('**/api/v1/**');
  });

  test('Concurrent modification errors', async ({ page, context }) => {
    // Open same page in two tabs
    const page1 = page;
    const page2 = await context.newPage();
    
    // Login in second tab
    await page2.goto('/login');
    await page2.fill('input[name="email"]', 'testuser@example.com');
    await page2.fill('input[name="password"]', 'TestPassword123!');
    await page2.click('button[type="submit"]');
    await page2.waitForURL('**/dashboard');
    
    // Both go to profile
    await page1.goto('/profile');
    await page2.goto('/profile');
    
    // Edit in both tabs
    await page1.fill('input[name="username"]', 'UpdatedName1');
    await page2.fill('input[name="username"]', 'UpdatedName2');
    
    // Save in first tab
    await page1.click('button:has-text("保存")');
    await expect(page1.locator(':has-text("保存しました")')).toBeVisible();
    
    // Try to save in second tab
    await page2.click('button:has-text("保存")');
    
    // Should show conflict error
    await expect(page2.locator(
      ':has-text("更新の競合"), ' +
      ':has-text("Conflict"), ' +
      ':has-text("他のユーザーが変更")'
    )).toBeVisible();
    
    // Should offer to reload
    const reloadButton = page2.locator('button:has-text("再読み込み"), button:has-text("Reload")');
    if (await reloadButton.count() > 0) {
      await reloadButton.click();
      
      // Should show updated value from page1
      const username = await page2.locator('input[name="username"]').inputValue();
      expect(username).toBe('UpdatedName1');
    }
    
    await page2.close();
  });

  test('Memory/performance errors', async ({ page }) => {
    // Monitor memory usage
    const metrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    if (metrics) {
      console.log('Initial memory:', {
        usedJSHeapSize: Math.round(metrics.usedJSHeapSize / 1024 / 1024) + 'MB',
        totalJSHeapSize: Math.round(metrics.totalJSHeapSize / 1024 / 1024) + 'MB'
      });
    }
    
    // Load heavy content (many images)
    await page.goto('/gallery');
    
    // Simulate loading many images
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
    }
    
    // Check for performance warnings
    const performanceWarning = page.locator(
      '.performance-warning, ' +
      ':has-text("パフォーマンス"), ' +
      ':has-text("メモリ使用量")'
    );
    
    if (await performanceWarning.count() > 0) {
      console.log('Performance warning displayed');
      
      // Should offer to reduce quality or clear cache
      const optimizeButton = page.locator('button:has-text("最適化"), button:has-text("Optimize")');
      if (await optimizeButton.count() > 0) {
        await optimizeButton.click();
        console.log('Optimization triggered');
      }
    }
  });

  test('Third-party service errors', async ({ page }) => {
    // Simulate Stripe being down
    await page.route('**/checkout.stripe.com/**', route => {
      route.abort('failed');
    });
    
    // Try to purchase tokens
    await page.goto('/tokens/purchase');
    await page.locator('.token-pack').first().click();
    await page.click('button:has-text("購入する")');
    
    // Should show payment service error
    await expect(page.locator(
      ':has-text("決済サービス"), ' +
      ':has-text("Payment service"), ' +
      ':has-text("一時的に利用できません")'
    )).toBeVisible({ timeout: 10000 });
    
    // Simulate OpenAI API error
    await page.route('**/api/v1/chat/**', async route => {
      await route.fulfill({
        status: 503,
        body: JSON.stringify({
          error: 'OpenAI service unavailable',
          message: 'AI サービスが一時的に利用できません'
        })
      });
    });
    
    // Try to chat
    await page.goto('/characters');
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    
    await page.fill('[data-testid="message-input"]', 'Hello');
    await page.click('button[type="submit"]');
    
    // Should show AI service error
    await expect(page.locator(
      ':has-text("AI サービス"), ' +
      ':has-text("AI service"), ' +
      ':has-text("しばらくしてから")'
    )).toBeVisible();
  });

  test('Data integrity errors', async ({ page }) => {
    // Simulate corrupted data response
    await page.route('**/api/v1/characters/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{invalid json'  // Malformed JSON
      });
    });
    
    await page.goto('/characters/123');
    
    // Should handle parse error gracefully
    await expect(page.locator(
      ':has-text("データエラー"), ' +
      ':has-text("Data error"), ' +
      ':has-text("正しく読み込めません")'
    )).toBeVisible();
    
    // Test missing required fields
    await page.route('**/api/v1/users/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          // Missing required fields like email, id
          username: 'TestUser'
        })
      });
    });
    
    await page.goto('/profile');
    
    // Should show data validation error
    const validationError = page.locator(
      '.validation-error, ' +
      ':has-text("データ検証エラー"), ' +
      ':has-text("必須項目が不足")'
    );
    
    if (await validationError.count() > 0) {
      await expect(validationError).toBeVisible();
    }
  });

  test('Browser compatibility warnings', async ({ page, browserName }) => {
    // Check for unsupported features
    const unsupportedFeatures = await page.evaluate(() => {
      const features = [];
      
      // Check WebGL support
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) features.push('WebGL');
      
      // Check Web Audio API
      if (!window.AudioContext && !(window as any).webkitAudioContext) {
        features.push('Web Audio API');
      }
      
      // Check Service Worker
      if (!('serviceWorker' in navigator)) {
        features.push('Service Worker');
      }
      
      return features;
    });
    
    if (unsupportedFeatures.length > 0) {
      console.log('Unsupported features:', unsupportedFeatures);
    }
    
    // Test with old browser user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko' // IE11
    });
    
    await page.goto('/');
    
    // Should show browser warning
    const browserWarning = page.locator(
      '.browser-warning, ' +
      '[data-testid="browser-compatibility"], ' +
      ':has-text("お使いのブラウザ"), ' +
      ':has-text("browser")'
    );
    
    if (await browserWarning.count() > 0) {
      await expect(browserWarning).toBeVisible();
      
      // Should suggest modern browsers
      await expect(browserWarning.locator(':has-text("Chrome"), :has-text("Firefox")')).toBeVisible();
    }
  });

  test('Localization errors', async ({ page }) => {
    // Force a non-existent locale
    await page.goto('/xx-YY/dashboard');
    
    // Should fallback gracefully
    await expect(page.locator('main, .dashboard')).toBeVisible();
    
    // Check for missing translations
    const missingTranslations = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const missing = [];
      
      elements.forEach(el => {
        if (el.textContent?.includes('{{') && el.textContent?.includes('}}')) {
          missing.push(el.textContent);
        }
      });
      
      return missing;
    });
    
    if (missingTranslations.length > 0) {
      console.log('Missing translations found:', missingTranslations);
    }
    
    // Test RTL language handling
    await page.goto('/ar/dashboard');
    
    const htmlDir = await page.locator('html').getAttribute('dir');
    if (htmlDir === 'rtl') {
      console.log('RTL mode activated for Arabic');
      
      // Check layout adjustments
      const mainContent = page.locator('main').first();
      const styles = await mainContent.evaluate(el => 
        window.getComputedStyle(el)
      );
      
      // Text should be right-aligned
      if (styles.textAlign === 'right' || styles.direction === 'rtl') {
        console.log('RTL styles applied correctly');
      }
    }
  });
});