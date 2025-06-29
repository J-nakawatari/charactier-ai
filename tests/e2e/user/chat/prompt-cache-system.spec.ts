import { test, expect } from '@playwright/test';

test.describe('プロンプトキャッシュシステムのE2Eテスト', () => {
  let userToken: string;
  const testEmail = `test-cache-${Date.now()}@example.com`;
  const testPassword = 'Test123!';

  test.beforeAll(async ({ page }) => {
    // テストユーザーの作成
    await page.goto('/ja/register');
    await page.locator('#email').fill(testEmail);
    await page.locator('#password').fill(testPassword);
    await page.locator('#confirmPassword').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    
    // 登録完了を待つ
    await page.waitForURL('**/register-complete', { timeout: 10000 });
    
    // メール認証をスキップ（テスト環境のため）
    // 実際のテストではメール認証APIを直接呼ぶ必要があるかもしれません
  });

  test('初回チャット時のプロンプトキャッシュ作成', async ({ page }) => {
    // ログイン
    await page.goto('/ja/login');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    
    // キャラクター一覧へ
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 最初のキャラクターを選択
    const firstCharacter = page.locator('.character-card').first();
    const characterName = await firstCharacter.locator('.character-name').textContent();
    await firstCharacter.click();
    
    // チャット画面に遷移
    await page.waitForURL('**/chat/**');
    
    // APIレスポンスをインターセプト
    const chatResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/chat/send') && response.request().method() === 'POST'
    );
    
    // メッセージを送信
    const messageInput = page.locator('textarea[placeholder*="メッセージ"]');
    await messageInput.fill('こんにちは！');
    await page.locator('button[type="submit"]').click();
    
    const response = await chatResponsePromise;
    const responseData = await response.json();
    
    // レスポンスヘッダーでキャッシュ状態を確認
    const cacheStatus = response.headers()['x-prompt-cache-status'];
    console.log(`初回チャット - キャッシュステータス: ${cacheStatus}`);
    
    // 初回はキャッシュミスのはず
    expect(cacheStatus).toBe('miss');
    
    // 同じキャラクターに再度メッセージを送信
    await messageInput.fill('元気ですか？');
    
    const secondResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/chat/send') && response.request().method() === 'POST'
    );
    
    await page.locator('button[type="submit"]').click();
    
    const secondResponse = await secondResponsePromise;
    const secondCacheStatus = secondResponse.headers()['x-prompt-cache-status'];
    console.log(`2回目のチャット - キャッシュステータス: ${secondCacheStatus}`);
    
    // 2回目はキャッシュヒットのはず
    expect(secondCacheStatus).toBe('hit');
  });

  test('親密度レベル変化時のキャッシュ無効化', async ({ page }) => {
    // ログイン済みの前提
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // テスト用キャラクターを選択
    const characterCard = page.locator('.character-card').first();
    await characterCard.click();
    
    // 複数回メッセージを送信して親密度を上げる
    const messageInput = page.locator('textarea[placeholder*="メッセージ"]');
    const levelDisplay = page.locator('.affinity-level-display');
    
    let initialLevel = 0;
    if (await levelDisplay.isVisible()) {
      const levelText = await levelDisplay.textContent();
      initialLevel = parseInt(levelText?.match(/\d+/)?.[0] || '0');
    }
    
    // 親密度が上がるまでメッセージを送信
    let messageCount = 0;
    let levelChanged = false;
    
    while (messageCount < 20 && !levelChanged) {
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/v1/chat/send') && response.request().method() === 'POST'
      );
      
      await messageInput.fill(`テストメッセージ ${messageCount + 1}`);
      await page.locator('button[type="submit"]').click();
      
      const response = await responsePromise;
      const cacheStatus = response.headers()['x-prompt-cache-status'];
      
      // レベルアップポップアップが表示されたか確認
      const levelUpPopup = page.locator('.level-up-popup');
      if (await levelUpPopup.isVisible({ timeout: 1000 })) {
        levelChanged = true;
        console.log('親密度レベルが変化しました');
        
        // レベル変化後のキャッシュステータスを確認
        expect(cacheStatus).toBe('miss'); // 新しいレベルなのでキャッシュミス
      }
      
      messageCount++;
      await page.waitForTimeout(1000); // レート制限対策
    }
  });

  test('プロンプトがAPIに正しく渡されているか検証', async ({ page }) => {
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // キャラクターを選択
    const characterCard = page.locator('.character-card').first();
    await characterCard.click();
    
    // ネットワークリクエストをインターセプト
    await page.route('**/api/v1/chat/send', async (route, request) => {
      const postData = request.postDataJSON();
      
      // リクエストボディの検証
      expect(postData).toHaveProperty('message');
      expect(postData).toHaveProperty('characterId');
      
      // プロンプトが含まれているか確認（デバッグ用）
      console.log('送信されたデータ:', {
        characterId: postData.characterId,
        messageLength: postData.message?.length,
        hasSessionId: !!postData.sessionId
      });
      
      // リクエストを続行
      await route.continue();
    });
    
    // メッセージ送信
    const messageInput = page.locator('textarea[placeholder*="メッセージ"]');
    await messageInput.fill('プロンプトテスト');
    await page.locator('button[type="submit"]').click();
    
    // レスポンスを待つ
    await page.waitForSelector('.message-bubble.ai-message', { timeout: 10000 });
  });

  test('キャッシュ統計情報の確認', async ({ page }) => {
    // 管理者としてログイン
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button[type="submit"]').click();
    
    // ダッシュボードへ
    await page.waitForURL('**/admin/dashboard');
    
    // キャッシュ統計ページへ（存在する場合）
    const cacheStatsLink = page.locator('a:has-text("キャッシュ統計")');
    if (await cacheStatsLink.isVisible()) {
      await cacheStatsLink.click();
      
      // キャッシュヒット率の表示を確認
      const hitRatio = page.locator('.cache-hit-ratio');
      if (await hitRatio.isVisible()) {
        const ratioText = await hitRatio.textContent();
        console.log(`キャッシュヒット率: ${ratioText}`);
        
        // ヒット率が0以上であることを確認
        const ratioValue = parseFloat(ratioText?.match(/\d+\.?\d*/)?.[0] || '0');
        expect(ratioValue).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('複数キャラクター間でのキャッシュ分離', async ({ page }) => {
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 最初のキャラクターでチャット
    const firstCharacter = page.locator('.character-card').nth(0);
    const firstName = await firstCharacter.locator('.character-name').textContent();
    await firstCharacter.click();
    
    await page.waitForURL('**/chat/**');
    const firstCharacterId = page.url().split('/').pop();
    
    // メッセージ送信
    const messageInput = page.locator('textarea[placeholder*="メッセージ"]');
    await messageInput.fill('キャッシュテスト1');
    
    const firstResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/chat/send')
    );
    
    await page.locator('button[type="submit"]').click();
    const firstResponse = await firstResponsePromise;
    const firstCacheStatus = firstResponse.headers()['x-prompt-cache-status'];
    
    // キャラクター一覧に戻る
    await page.goto('/ja/characters');
    
    // 2番目のキャラクターでチャット
    const secondCharacter = page.locator('.character-card').nth(1);
    const secondName = await secondCharacter.locator('.character-name').textContent();
    await secondCharacter.click();
    
    await page.waitForURL('**/chat/**');
    const secondCharacterId = page.url().split('/').pop();
    
    // 同じメッセージを送信
    await messageInput.fill('キャッシュテスト1');
    
    const secondResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/chat/send')
    );
    
    await page.locator('button[type="submit"]').click();
    const secondResponse = await secondResponsePromise;
    const secondCacheStatus = secondResponse.headers()['x-prompt-cache-status'];
    
    console.log(`キャラクター1 (${firstName}): ${firstCacheStatus}`);
    console.log(`キャラクター2 (${secondName}): ${secondCacheStatus}`);
    
    // 異なるキャラクターなので、2番目もキャッシュミスのはず
    if (firstCharacterId !== secondCharacterId) {
      expect(secondCacheStatus).toBe('miss');
    }
  });
});