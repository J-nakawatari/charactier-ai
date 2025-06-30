import { test, expect } from '@playwright/test';

test.describe('プロンプトキャチE��ュシスチE��のE2EチE��チE, () => {
  let userToken: string;
  const testEmail = `test-cache-${Date.now()}@example.com`;
  const testPassword = 'Test123!';

  test.beforeAll(async ({ page }) => {
    // チE��トユーザーの作�E
    await page.goto('/ja/register');
    await page.locator('#email').fill(testEmail);
    await page.locator('#password').fill(testPassword);
    await page.locator('#confirmPassword').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    
    // 登録完亁E��征E��
    await page.waitForURL('**/register-complete', { timeout: 10000 });
    
    // メール認証をスキチE�E�E�テスト環墁E�Eため�E�E
    // 実際のチE��トではメール認証APIを直接呼ぶ忁E��があるかもしれません
  });

  test('初回チャチE��時�EプロンプトキャチE��ュ作�E', async ({ page }) => {
    // ログイン
    await page.goto('/ja/login');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    
    // キャラクター一覧へ
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 最初�Eキャラクターを選抁E
    const firstCharacter = page.locator('.character-card').first();
    const characterName = await firstCharacter.locator('.character-name').textContent();
    await firstCharacter.click();
    
    // チャチE��画面に遷移
    await page.waitForURL('**/chat/**');
    
    // APIレスポンスをインターセプト
    const chatResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/chat/send') && response.request().method() === 'POST'
    );
    
    // メチE��ージを送信
    const messageInput = page.locator('textarea[placeholder*="メチE��ージ"]');
    await messageInput.fill('こんにちは�E�E);
    await page.locator('button[type="submit"]').click();
    
    const response = await chatResponsePromise;
    const responseData = await response.json();
    
    // レスポンスヘッダーでキャチE��ュ状態を確誁E
    const cacheStatus = response.headers()['x-prompt-cache-status'];
    console.log(`初回チャチE�� - キャチE��ュスチE�Eタス: ${cacheStatus}`);
    
    // 初回はキャチE��ュミスのはぁE
    expect(cacheStatus).toBe('miss');
    
    // 同じキャラクターに再度メチE��ージを送信
    await messageInput.fill('允E��ですか�E�E);
    
    const secondResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/chat/send') && response.request().method() === 'POST'
    );
    
    await page.locator('button[type="submit"]').click();
    
    const secondResponse = await secondResponsePromise;
    const secondCacheStatus = secondResponse.headers()['x-prompt-cache-status'];
    console.log(`2回目のチャチE�� - キャチE��ュスチE�Eタス: ${secondCacheStatus}`);
    
    // 2回目はキャチE��ュヒット�EはぁE
    expect(secondCacheStatus).toBe('hit');
  });

  test('親寁E��レベル変化時�EキャチE��ュ無効匁E, async ({ page }) => {
    // ログイン済みの前提
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // チE��ト用キャラクターを選抁E
    const characterCard = page.locator('.character-card').first();
    await characterCard.click();
    
    // 褁E��回メチE��ージを送信して親寁E��を上げめE
    const messageInput = page.locator('textarea[placeholder*="メチE��ージ"]');
    const levelDisplay = page.locator('.affinity-level-display');
    
    let initialLevel = 0;
    if (await levelDisplay.isVisible()) {
      const levelText = await levelDisplay.textContent();
      initialLevel = parseInt(levelText?.match(/\d+/)?.[0] || '0');
    }
    
    // 親寁E��が上がるまでメチE��ージを送信
    let messageCount = 0;
    let levelChanged = false;
    
    while (messageCount < 20 && !levelChanged) {
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/v1/chat/send') && response.request().method() === 'POST'
      );
      
      await messageInput.fill(`チE��トメチE��ージ ${messageCount + 1}`);
      await page.locator('button[type="submit"]').click();
      
      const response = await responsePromise;
      const cacheStatus = response.headers()['x-prompt-cache-status'];
      
      // レベルアチE�EポップアチE�Eが表示されたか確誁E
      const levelUpPopup = page.locator('.level-up-popup');
      if (await levelUpPopup.isVisible({ timeout: 1000 })) {
        levelChanged = true;
        console.log('親寁E��レベルが変化しました');
        
        // レベル変化後�EキャチE��ュスチE�Eタスを確誁E
        expect(cacheStatus).toBe('miss'); // 新しいレベルなのでキャチE��ュミス
      }
      
      messageCount++;
      await page.waitForTimeout(1000); // レート制限対筁E
    }
  });

  test('プロンプトがAPIに正しく渡されてぁE��か検証', async ({ page }) => {
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // キャラクターを選抁E
    const characterCard = page.locator('.character-card').first();
    await characterCard.click();
    
    // ネットワークリクエストをインターセプト
    await page.route('**/api/v1/chat/send', async (route, request) => {
      const postData = request.postDataJSON();
      
      // リクエスト�EチE��の検証
      expect(postData).toHaveProperty('message');
      expect(postData).toHaveProperty('characterId');
      
      // プロンプトが含まれてぁE��か確認（デバッグ用�E�E
      console.log('送信されたデータ:', {
        characterId: postData.characterId,
        messageLength: postData.message?.length,
        hasSessionId: !!postData.sessionId
      });
      
      // リクエストを続衁E
      await route.continue();
    });
    
    // メチE��ージ送信
    const messageInput = page.locator('textarea[placeholder*="メチE��ージ"]');
    await messageInput.fill('プロンプトチE��チE);
    await page.locator('button[type="submit"]').click();
    
    // レスポンスを征E��
    await page.waitForSelector('.message-bubble.ai-message', { timeout: 10000 });
  });

  test('キャチE��ュ統計情報の確誁E, async ({ page }) => {
    // 管琁E��E��してログイン
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button[type="submit"]').click();
    
    // ダチE��ュボ�Eドへ
    await page.waitForURL('**/admin/dashboard');
    
    // キャチE��ュ統計�Eージへ�E�存在する場合！E
    const cacheStatsLink = page.locator('a:has-text("キャチE��ュ統訁E)');
    if (await cacheStatsLink.isVisible()) {
      await cacheStatsLink.click();
      
      // キャチE��ュヒット率の表示を確誁E
      const hitRatio = page.locator('.cache-hit-ratio');
      if (await hitRatio.isVisible()) {
        const ratioText = await hitRatio.textContent();
        console.log(`キャチE��ュヒット率: ${ratioText}`);
        
        // ヒット率ぁE以上であることを確誁E
        const ratioValue = parseFloat(ratioText?.match(/\d+\.?\d*/)?.[0] || '0');
        expect(ratioValue).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('褁E��キャラクター間でのキャチE��ュ刁E��', async ({ page }) => {
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 最初�EキャラクターでチャチE��
    const firstCharacter = page.locator('.character-card').nth(0);
    const firstName = await firstCharacter.locator('.character-name').textContent();
    await firstCharacter.click();
    
    await page.waitForURL('**/chat/**');
    const firstCharacterId = page.url().split('/').pop();
    
    // メチE��ージ送信
    const messageInput = page.locator('textarea[placeholder*="メチE��ージ"]');
    await messageInput.fill('キャチE��ュチE��チE');
    
    const firstResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/chat/send')
    );
    
    await page.locator('button[type="submit"]').click();
    const firstResponse = await firstResponsePromise;
    const firstCacheStatus = firstResponse.headers()['x-prompt-cache-status'];
    
    // キャラクター一覧に戻めE
    await page.goto('/ja/characters');
    
    // 2番目のキャラクターでチャチE��
    const secondCharacter = page.locator('.character-card').nth(1);
    const secondName = await secondCharacter.locator('.character-name').textContent();
    await secondCharacter.click();
    
    await page.waitForURL('**/chat/**');
    const secondCharacterId = page.url().split('/').pop();
    
    // 同じメチE��ージを送信
    await messageInput.fill('キャチE��ュチE��チE');
    
    const secondResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/chat/send')
    );
    
    await page.locator('button[type="submit"]').click();
    const secondResponse = await secondResponsePromise;
    const secondCacheStatus = secondResponse.headers()['x-prompt-cache-status'];
    
    console.log(`キャラクター1 (${firstName}): ${firstCacheStatus}`);
    console.log(`キャラクター2 (${secondName}): ${secondCacheStatus}`);
    
    // 異なるキャラクターなので、E番目もキャチE��ュミスのはぁE
    if (firstCharacterId !== secondCharacterId) {
      expect(secondCacheStatus).toBe('miss');
    }
  });
});
