import { test, expect } from '@playwright/test';

test.describe('Google Analytics設定テスト', () => {
  test('GA設定APIが正しく動作すること', async ({ page }) => {
    // GA設定APIをテスト
    const response = await page.request.get('/api/v1/system-settings/google-analytics');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('isActive');
    expect(data).toHaveProperty('settings');
  });

  test('GAスクリプトがクライアントサイドで動的に読み込まれること', async ({ page }) => {
    // ホームページに移動
    await page.goto('/');
    
    // 少し待つ（動的スクリプトの読み込みのため）
    await page.waitForTimeout(2000);
    
    // window.gtagが定義されているかチェック
    const hasGtag = await page.evaluate(() => {
      return typeof window.gtag === 'function';
    });
    
    // GA設定APIを確認
    const response = await page.request.get('/api/v1/system-settings/google-analytics');
    const data = await response.json();
    
    if (data.isActive && data.settings?.measurementId) {
      // GAが有効な場合、gtagが存在するはず
      expect(hasGtag).toBeTruthy();
      
      // GAスクリプトタグが存在するかチェック
      const gaScriptExists = await page.evaluate((measurementId) => {
        const scripts = Array.from(document.querySelectorAll('script'));
        return scripts.some(script => 
          script.src && script.src.includes(`googletagmanager.com/gtag/js?id=${measurementId}`)
        );
      }, data.settings.measurementId);
      
      expect(gaScriptExists).toBeTruthy();
      
      // dataLayerが存在するかチェック
      const hasDataLayer = await page.evaluate(() => {
        return Array.isArray(window.dataLayer);
      });
      expect(hasDataLayer).toBeTruthy();
    } else {
      // GAが無効な場合、gtagは存在しないはず
      expect(hasGtag).toBeFalsy();
    }
  });

  test('ページ遷移時にGAイベントが送信されること', async ({ page }) => {
    // GA設定を確認
    const settingsResponse = await page.request.get('/api/v1/system-settings/google-analytics');
    const settings = await settingsResponse.json();
    
    if (!settings.isActive || !settings.settings?.measurementId) {
      test.skip();
      return;
    }
    
    // dataLayer のイベントを監視
    await page.goto('/');
    
    // dataLayerの初期化を待つ
    await page.waitForFunction(() => window.dataLayer && window.dataLayer.length > 0, { timeout: 5000 });
    
    // 現在のdataLayerの長さを記録
    const initialDataLayerLength = await page.evaluate(() => window.dataLayer.length);
    
    // 別のページに遷移
    await page.goto('/ja/login');
    await page.waitForLoadState('networkidle');
    
    // dataLayerに新しいイベントが追加されたか確認
    const newDataLayerLength = await page.evaluate(() => window.dataLayer.length);
    
    // ページビューイベントが追加されているはず
    expect(newDataLayerLength).toBeGreaterThan(initialDataLayerLength);
    
    // 最新のイベントを確認
    const latestEvents = await page.evaluate(() => {
      return window.dataLayer.slice(-5); // 最後の5つのイベント
    });
    
    // configイベントまたはpage_viewイベントが含まれているか確認
    const hasPageViewEvent = latestEvents.some(event => {
      return (event[0] === 'config' || event[0] === 'event') && 
             (event[1] === settings.settings.measurementId || event[1] === 'page_view');
    });
    
    expect(hasPageViewEvent).toBeTruthy();
  });

  test('ユーザーログイン時にuser_idが設定されること', async ({ page }) => {
    // GA設定を確認
    const settingsResponse = await page.request.get('/api/v1/system-settings/google-analytics');
    const settings = await settingsResponse.json();
    
    if (!settings.isActive || !settings.settings?.measurementId) {
      test.skip();
      return;
    }
    
    // ログインページに移動
    await page.goto('/ja/login');
    
    // テストユーザー情報（実際のテストではモックユーザーを使用）
    const testUser = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      _id: 'test-user-id-123'
    };
    
    // localStorageにユーザー情報を設定（実際のログインをシミュレート）
    await page.evaluate((user) => {
      localStorage.setItem('user', JSON.stringify(user));
      // storageイベントを手動で発火
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'user',
        newValue: JSON.stringify(user),
        url: window.location.href
      }));
    }, testUser);
    
    // user_idが設定されるまで待つ
    await page.waitForTimeout(1000);
    
    // dataLayerでuser_idが設定されているか確認
    const hasUserId = await page.evaluate((expectedUserId) => {
      const dataLayer = window.dataLayer || [];
      return dataLayer.some(event => {
        if (event[0] === 'config' && event[2] && event[2].user_id === expectedUserId) {
          return true;
        }
        if (event[0] === 'set' && event[1] && event[1].user_id === expectedUserId) {
          return true;
        }
        return false;
      });
    }, testUser._id);
    
    expect(hasUserId).toBeTruthy();
  });
});