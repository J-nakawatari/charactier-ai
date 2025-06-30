import { test, expect } from '@playwright/test';

test.describe('Error Handling E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up error monitoring
    const errors: string[] = [];
    page.on('pageerror', error => {
      errors.push(error.message);
      console.log('Page error:', error.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
        console.log('Console error:', msg.text());
      }
    });
  });

  test('Network error handling', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Simulate network failure
    await page.context().setOffline(true);
    
    // Try to load a page
    try {
      await page.goto('/characters');
    } catch (error) {
      // Navigation will fail
      console.log('Navigation failed as expected');
    }
    
    // Should show offline indicator or error page
    const offlineIndicator = page.locator(
      '.offline-indicator, ' +
      '[data-testid="offline-banner"], ' +
      ':has-text("オフライン"), ' +
      ':has-text("Offline"), ' +
      ':has-text("接続エラー")'
    );
    
    await expect(offlineIndicator).toBeVisible({ timeout: 10000 });
    
    // Try an action while offline
    const actionButton = page.locator('button').first();
    if (await actionButton.count() > 0) {
      await actionButton.click();
      
      // Should show error message
      const errorMessage = page.locator(
        '.error-message, ' +
        '.error-toast, ' +
        '[role="alert"]:has-text("エラー"), ' +
        '[role="alert"]:has-text("Error")'
      );
      
      await expect(errorMessage).toBeVisible();
    }
    
    // Go back online
    await page.context().setOffline(false);
    
    // Should auto-recover or show recovery option
    const retryButton = page.locator('button:has-text("再試行"), button:has-text("Retry")');
    if (await retryButton.count() > 0) {
      await retryButton.click();
      await page.waitForURL('**/characters', { timeout: 10000 });
    }
  });

  test('API error responses', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Intercept API calls to simulate errors
    await page.route('**/api/v1/**', async route => {
      // Simulate different error codes
      const url = route.request().url();
      
      if (url.includes('characters')) {
        // 500 Internal Server Error
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal Server Error',
            message: 'サーバーエラーが発生しました'
          })
        });
      } else if (url.includes('chat')) {
        // 429 Too Many Requests
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Too Many Requests',
            message: 'リクエストが多すぎます。しばらく待ってから再試行してください。'
          })
        });
      } else {
        await route.continue();
      }
    });
    
    // Try to load characters - should get 500 error
    await page.goto('/characters');
    
    // Should show error state
    const serverError = page.locator(
      ':has-text("サーバーエラー"), ' +
      ':has-text("Server Error"), ' +
      ':has-text("500"), ' +
      '.error-state'
    );
    
    await expect(serverError).toBeVisible();
    
    // Should have retry option
    const retryButton = page.locator('button:has-text("再試行"), button:has-text("Try again")');
    await expect(retryButton).toBeVisible();
    
    // Remove route intercept
    await page.unroute('**/api/v1/**');
  });

  test('Form validation errors', async ({ page }) => {
    // Test registration form validation
    await page.goto('/register');
    
    // Submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    const validationErrors = page.locator('.error, .field-error, [role="alert"]');
    const errorCount = await validationErrors.count();
    expect(errorCount).toBeGreaterThan(0);
    
    // Test specific field validations
    
    // Invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    await expect(page.locator(':has-text("有効なメールアドレス"), :has-text("valid email")')).toBeVisible();
    
    // Weak password
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '123');
    await page.click('button[type="submit"]');
    await expect(page.locator(':has-text("パスワードは"), :has-text("Password must")')).toBeVisible();
    
    // Password mismatch
    await page.fill('input[name="password"]', 'StrongPassword123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    await page.click('button[type="submit"]');
    await expect(page.locator(':has-text("一致しません"), :has-text("match")')).toBeVisible();
    
    // Terms not accepted
    const termsCheckbox = page.locator('input[name="terms"]');
    if (await termsCheckbox.count() > 0) {
      await page.click('button[type="submit"]');
      await expect(page.locator(':has-text("同意"), :has-text("agree")')).toBeVisible();
    }
  });

  test('Authentication errors', async ({ page }) => {
    // Test login with wrong credentials
    await page.goto('/login');
    
    // Wrong password
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');
    
    // Should show error
    await expect(page.locator(
      ':has-text("パスワードが正しくありません"), ' +
      ':has-text("Incorrect password"), ' +
      ':has-text("認証エラー")'
    )).toBeVisible();
    
    // Non-existent user
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    await expect(page.locator(
      ':has-text("ユーザーが見つかりません"), ' +
      ':has-text("User not found"), ' +
      ':has-text("アカウントが存在しません")'
    )).toBeVisible();
    
    // Account locked (after multiple failed attempts)
    for (let i = 0; i < 5; i++) {
      await page.fill('input[name="email"]', 'testuser@example.com');
      await page.fill('input[name="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }
    
    // Might show account locked message
    const lockedMessage = page.locator(
      ':has-text("アカウントがロック"), ' +
      ':has-text("Account locked"), ' +
      ':has-text("しばらくお待ちください")'
    );
    
    if (await lockedMessage.count() > 0) {
      await expect(lockedMessage).toBeVisible();
      console.log('Account locked after multiple failed attempts');
    }
  });

  test('Payment/Stripe errors', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Go to token purchase
    await page.goto('/tokens/purchase');
    await page.locator('.token-pack').first().click();
    await page.click('button:has-text("購入する")');
    
    // Wait for Stripe
    await page.waitForURL(/stripe\.com/, { timeout: 15000 });
    
    // Test various card errors
    const cardErrors = [
      { number: '4000000000000002', error: 'declined' },
      { number: '4000000000009995', error: 'insufficient_funds' },
      { number: '4000000000000069', error: 'expired_card' },
      { number: '4000000000000127', error: 'incorrect_cvc' }
    ];
    
    for (const { number, error } of cardErrors) {
      // Fill card details
      await page.fill('input[placeholder*="Card number"]', number);
      await page.fill('input[placeholder*="MM / YY"]', '12/35');
      await page.fill('input[placeholder*="CVC"]', '123');
      
      // Try to pay
      await page.click('button[type="submit"]');
      
      // Should show specific error
      await expect(page.locator(
        `:has-text("${error}"), ` +
        ':has-text("拒否"), ' +
        ':has-text("残高不足"), ' +
        ':has-text("有効期限")'
      )).toBeVisible({ timeout: 10000 });
      
      // Clear for next test
      await page.fill('input[placeholder*="Card number"]', '');
    }
  });

  test('File upload errors', async ({ page }) => {
    // Login and go to profile
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    await page.goto('/profile');
    
    // Find file upload input (avatar upload)
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.count() > 0) {
      // Test file size error
      // Create a large file buffer (>10MB)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      await fileInput.setInputFiles({
        name: 'large-file.jpg',
        mimeType: 'image/jpeg',
        buffer: largeBuffer
      });
      
      // Should show size error
      await expect(page.locator(
        ':has-text("ファイルサイズ"), ' +
        ':has-text("File too large"), ' +
        ':has-text("10MB")'
      )).toBeVisible();
      
      // Test invalid file type
      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('PDF content')
      });
      
      // Should show type error
      await expect(page.locator(
        ':has-text("ファイル形式"), ' +
        ':has-text("File type"), ' +
        ':has-text("画像")'
      )).toBeVisible();
    }
  });

  test('Token insufficient error', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Mock low token balance
    await page.route('**/api/v1/users/me', async route => {
      const response = await route.fetch();
      const data = await response.json();
      data.tokenBalance = 10; // Very low balance
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data)
      });
    });
    
    // Try to chat
    await page.goto('/characters');
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    
    // Try to send message
    await page.fill('[data-testid="message-input"]', 'Test message');
    await page.click('button[type="submit"]');
    
    // Should show insufficient tokens error
    await expect(page.locator(
      ':has-text("トークンが不足"), ' +
      ':has-text("Insufficient tokens"), ' +
      ':has-text("購入")'
    )).toBeVisible();
    
    // Should offer to purchase
    const purchaseLink = page.locator('a:has-text("購入"), button:has-text("Purchase")');
    if (await purchaseLink.count() > 0) {
      await purchaseLink.click();
      await expect(page).toHaveURL(/tokens\/purchase/);
    }
  });

  test('404 and route errors', async ({ page }) => {
    // Try to access non-existent page
    await page.goto('/non-existent-page-12345');
    
    // Should show 404 page
    await expect(page.locator(
      'h1:has-text("404"), ' +
      ':has-text("ページが見つかりません"), ' +
      ':has-text("Page not found")'
    )).toBeVisible();
    
    // Should have navigation options
    const homeLink = page.locator('a:has-text("ホーム"), a:has-text("Home")');
    await expect(homeLink).toBeVisible();
    
    // Test protected route without auth
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
    
    // Should show message about needing to login
    const loginMessage = page.locator(
      ':has-text("ログインが必要"), ' +
      ':has-text("Please login"), ' +
      ':has-text("認証が必要")'
    );
    
    if (await loginMessage.count() > 0) {
      await expect(loginMessage).toBeVisible();
    }
  });

  test('Timeout errors', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Simulate slow API response
    await page.route('**/api/v1/chat/**', async route => {
      // Delay for 35 seconds (typical timeout is 30s)
      await new Promise(resolve => setTimeout(resolve, 35000));
      await route.abort('timedout');
    });
    
    // Try to send chat message
    await page.goto('/characters');
    await page.locator('.character-card:has(.free-badge)').first().click();
    await page.click('button:has-text("チャットを開始")');
    
    await page.fill('[data-testid="message-input"]', 'Test timeout');
    await page.click('button[type="submit"]');
    
    // Should show timeout error
    await expect(page.locator(
      ':has-text("タイムアウト"), ' +
      ':has-text("Timeout"), ' +
      ':has-text("時間がかかりすぎています")'
    )).toBeVisible({ timeout: 40000 });
    
    // Remove route override
    await page.unroute('**/api/v1/chat/**');
  });

  test('Error recovery mechanisms', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Test auto-retry
    let attemptCount = 0;
    await page.route('**/api/v1/characters', async route => {
      attemptCount++;
      if (attemptCount < 3) {
        // Fail first 2 attempts
        await route.fulfill({
          status: 500,
          body: 'Server Error'
        });
      } else {
        // Succeed on 3rd attempt
        await route.continue();
      }
    });
    
    await page.goto('/characters');
    
    // Should eventually succeed after retries
    await expect(page.locator('.character-card').first()).toBeVisible({ timeout: 15000 });
    console.log(`Succeeded after ${attemptCount} attempts`);
    
    // Test error boundary recovery
    // Inject error to trigger error boundary
    await page.evaluate(() => {
      throw new Error('Test error boundary');
    });
    
    // Should show error boundary UI
    const errorBoundary = page.locator(
      '.error-boundary, ' +
      '[data-testid="error-boundary"], ' +
      ':has-text("エラーが発生しました")'
    );
    
    if (await errorBoundary.count() > 0) {
      await expect(errorBoundary).toBeVisible();
      
      // Should have reload button
      const reloadButton = errorBoundary.locator('button:has-text("再読み込み"), button:has-text("Reload")');
      if (await reloadButton.count() > 0) {
        await reloadButton.click();
        // Page should reload
        await page.waitForLoadState('load');
      }
    }
  });

  test('Graceful degradation', async ({ page }) => {
    // Test with JavaScript disabled
    await page.goto('/');
    
    // Disable JavaScript
    await page.context().addInitScript(() => {
      // Disable some features to simulate partial JS failure
      window.WebSocket = undefined;
      window.EventSource = undefined;
    });
    
    await page.goto('/login');
    
    // Basic functionality should still work
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    
    // Test with slow connection
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 50 * 1024 / 8, // 50kb/s
      uploadThroughput: 20 * 1024 / 8,   // 20kb/s
      latency: 2000 // 2s latency
    });
    
    // Should show loading states
    await page.goto('/dashboard');
    
    const loadingIndicator = page.locator(
      '.loading, ' +
      '.skeleton, ' +
      '[data-loading="true"], ' +
      '.spinner'
    );
    
    await expect(loadingIndicator).toBeVisible();
    
    // Eventually should load (with degraded performance)
    await expect(page.locator('.dashboard-content, main')).toBeVisible({ timeout: 30000 });
  });
});