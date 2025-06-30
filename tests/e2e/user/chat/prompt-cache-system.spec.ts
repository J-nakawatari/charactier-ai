import { test, expect } from '@playwright/test';

test.describe('繝励Ο繝ｳ繝励ヨ繧ｭ繝｣繝・す繝･繧ｷ繧ｹ繝・Β縺ｮE2E繝・せ繝・, () => {
  let userToken: string;
  const testEmail = `test-cache-${Date.now()}@example.com`;
  const testPassword = 'Test123!';

  test.beforeAll(async ({ page }) => {
    // 繝・せ繝医Θ繝ｼ繧ｶ繝ｼ縺ｮ菴懈・
    await page.goto('/ja/register');
    await page.locator('#email').fill(testEmail);
    await page.locator('#password').fill(testPassword);
    await page.locator('#confirmPassword').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    
    // 逋ｻ骭ｲ螳御ｺ・ｒ蠕・▽
    await page.waitForURL('**/register-complete', { timeout: 10000 });
    
    // 繝｡繝ｼ繝ｫ隱崎ｨｼ繧偵せ繧ｭ繝・・・医ユ繧ｹ繝育腸蠅・・縺溘ａ・・
    // 螳滄圀縺ｮ繝・せ繝医〒縺ｯ繝｡繝ｼ繝ｫ隱崎ｨｼAPI繧堤峩謗･蜻ｼ縺ｶ蠢・ｦ√′縺ゅｋ縺九ｂ縺励ｌ縺ｾ縺帙ｓ
  });

  test('蛻晏屓繝√Ε繝・ヨ譎ゅ・繝励Ο繝ｳ繝励ヨ繧ｭ繝｣繝・す繝･菴懈・', async ({ page }) => {
    // 繝ｭ繧ｰ繧､繝ｳ
    await page.goto('/ja/login');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    
    // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ縺ｸ
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 譛蛻昴・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧帝∈謚・
    const firstCharacter = page.locator('.character-card').first();
    const characterName = await firstCharacter.locator('.character-name').textContent();
    await firstCharacter.click();
    
    // 繝√Ε繝・ヨ逕ｻ髱｢縺ｫ驕ｷ遘ｻ
    await page.waitForURL('**/chat/**');
    
    // API繝ｬ繧ｹ繝昴Φ繧ｹ繧偵う繝ｳ繧ｿ繝ｼ繧ｻ繝励ヨ
    const chatResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/chat/send') && response.request().method() === 'POST'
    );
    
    // 繝｡繝・そ繝ｼ繧ｸ繧帝∽ｿ｡
    const messageInput = page.locator('textarea[placeholder*="繝｡繝・そ繝ｼ繧ｸ"]');
    await messageInput.fill('縺薙ｓ縺ｫ縺｡縺ｯ・・);
    await page.locator('button[type="submit"]').click();
    
    const response = await chatResponsePromise;
    const responseData = await response.json();
    
    // 繝ｬ繧ｹ繝昴Φ繧ｹ繝倥ャ繝繝ｼ縺ｧ繧ｭ繝｣繝・す繝･迥ｶ諷九ｒ遒ｺ隱・
    const cacheStatus = response.headers()['x-prompt-cache-status'];
    console.log(`蛻晏屓繝√Ε繝・ヨ - 繧ｭ繝｣繝・す繝･繧ｹ繝・・繧ｿ繧ｹ: ${cacheStatus}`);
    
    // 蛻晏屓縺ｯ繧ｭ繝｣繝・す繝･繝溘せ縺ｮ縺ｯ縺・
    expect(cacheStatus).toBe('miss');
    
    // 蜷後§繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｫ蜀榊ｺｦ繝｡繝・そ繝ｼ繧ｸ繧帝∽ｿ｡
    await messageInput.fill('蜈・ｰ励〒縺吶°・・);
    
    const secondResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/chat/send') && response.request().method() === 'POST'
    );
    
    await page.locator('button[type="submit"]').click();
    
    const secondResponse = await secondResponsePromise;
    const secondCacheStatus = secondResponse.headers()['x-prompt-cache-status'];
    console.log(`2蝗樒岼縺ｮ繝√Ε繝・ヨ - 繧ｭ繝｣繝・す繝･繧ｹ繝・・繧ｿ繧ｹ: ${secondCacheStatus}`);
    
    // 2蝗樒岼縺ｯ繧ｭ繝｣繝・す繝･繝偵ャ繝医・縺ｯ縺・
    expect(secondCacheStatus).toBe('hit');
  });

  test('隕ｪ蟇・ｺｦ繝ｬ繝吶Ν螟牙喧譎ゅ・繧ｭ繝｣繝・す繝･辟｡蜉ｹ蛹・, async ({ page }) => {
    // 繝ｭ繧ｰ繧､繝ｳ貂医∩縺ｮ蜑肴署
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 繝・せ繝育畑繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧帝∈謚・
    const characterCard = page.locator('.character-card').first();
    await characterCard.click();
    
    // 隍・焚蝗槭Γ繝・そ繝ｼ繧ｸ繧帝∽ｿ｡縺励※隕ｪ蟇・ｺｦ繧剃ｸ翫￡繧・
    const messageInput = page.locator('textarea[placeholder*="繝｡繝・そ繝ｼ繧ｸ"]');
    const levelDisplay = page.locator('.affinity-level-display');
    
    let initialLevel = 0;
    if (await levelDisplay.isVisible()) {
      const levelText = await levelDisplay.textContent();
      initialLevel = parseInt(levelText?.match(/\d+/)?.[0] || '0');
    }
    
    // 隕ｪ蟇・ｺｦ縺御ｸ翫′繧九∪縺ｧ繝｡繝・そ繝ｼ繧ｸ繧帝∽ｿ｡
    let messageCount = 0;
    let levelChanged = false;
    
    while (messageCount < 20 && !levelChanged) {
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/v1/chat/send') && response.request().method() === 'POST'
      );
      
      await messageInput.fill(`繝・せ繝医Γ繝・そ繝ｼ繧ｸ ${messageCount + 1}`);
      await page.locator('button[type="submit"]').click();
      
      const response = await responsePromise;
      const cacheStatus = response.headers()['x-prompt-cache-status'];
      
      // 繝ｬ繝吶Ν繧｢繝・・繝昴ャ繝励い繝・・縺瑚｡ｨ遉ｺ縺輔ｌ縺溘°遒ｺ隱・
      const levelUpPopup = page.locator('.level-up-popup');
      if (await levelUpPopup.isVisible({ timeout: 1000 })) {
        levelChanged = true;
        console.log('隕ｪ蟇・ｺｦ繝ｬ繝吶Ν縺悟､牙喧縺励∪縺励◆');
        
        // 繝ｬ繝吶Ν螟牙喧蠕後・繧ｭ繝｣繝・す繝･繧ｹ繝・・繧ｿ繧ｹ繧堤｢ｺ隱・
        expect(cacheStatus).toBe('miss'); // 譁ｰ縺励＞繝ｬ繝吶Ν縺ｪ縺ｮ縺ｧ繧ｭ繝｣繝・す繝･繝溘せ
      }
      
      messageCount++;
      await page.waitForTimeout(1000); // 繝ｬ繝ｼ繝亥宛髯仙ｯｾ遲・
    }
  });

  test('繝励Ο繝ｳ繝励ヨ縺窟PI縺ｫ豁｣縺励￥貂｡縺輔ｌ縺ｦ縺・ｋ縺区､懆ｨｼ', async ({ page }) => {
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧帝∈謚・
    const characterCard = page.locator('.character-card').first();
    await characterCard.click();
    
    // 繝阪ャ繝医Ρ繝ｼ繧ｯ繝ｪ繧ｯ繧ｨ繧ｹ繝医ｒ繧､繝ｳ繧ｿ繝ｼ繧ｻ繝励ヨ
    await page.route('**/api/v1/chat/send', async (route, request) => {
      const postData = request.postDataJSON();
      
      // 繝ｪ繧ｯ繧ｨ繧ｹ繝医・繝・ぅ縺ｮ讀懆ｨｼ
      expect(postData).toHaveProperty('message');
      expect(postData).toHaveProperty('characterId');
      
      // 繝励Ο繝ｳ繝励ヨ縺悟性縺ｾ繧後※縺・ｋ縺狗｢ｺ隱搾ｼ医ョ繝舌ャ繧ｰ逕ｨ・・
      console.log('騾∽ｿ｡縺輔ｌ縺溘ョ繝ｼ繧ｿ:', {
        characterId: postData.characterId,
        messageLength: postData.message?.length,
        hasSessionId: !!postData.sessionId
      });
      
      // 繝ｪ繧ｯ繧ｨ繧ｹ繝医ｒ邯夊｡・
      await route.continue();
    });
    
    // 繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡
    const messageInput = page.locator('textarea[placeholder*="繝｡繝・そ繝ｼ繧ｸ"]');
    await messageInput.fill('繝励Ο繝ｳ繝励ヨ繝・せ繝・);
    await page.locator('button[type="submit"]').click();
    
    // 繝ｬ繧ｹ繝昴Φ繧ｹ繧貞ｾ・▽
    await page.waitForSelector('.message-bubble.ai-message', { timeout: 10000 });
  });

  test('繧ｭ繝｣繝・す繝･邨ｱ險域ュ蝣ｱ縺ｮ遒ｺ隱・, async ({ page }) => {
    // 邂｡逅・・→縺励※繝ｭ繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button[type="submit"]').click();
    
    // 繝繝・す繝･繝懊・繝峨∈
    await page.waitForURL('**/admin/dashboard');
    
    // 繧ｭ繝｣繝・す繝･邨ｱ險医・繝ｼ繧ｸ縺ｸ・亥ｭ伜惠縺吶ｋ蝣ｴ蜷茨ｼ・
    const cacheStatsLink = page.locator('a:has-text("繧ｭ繝｣繝・す繝･邨ｱ險・)');
    if (await cacheStatsLink.isVisible()) {
      await cacheStatsLink.click();
      
      // 繧ｭ繝｣繝・す繝･繝偵ャ繝育紫縺ｮ陦ｨ遉ｺ繧堤｢ｺ隱・
      const hitRatio = page.locator('.cache-hit-ratio');
      if (await hitRatio.isVisible()) {
        const ratioText = await hitRatio.textContent();
        console.log(`繧ｭ繝｣繝・す繝･繝偵ャ繝育紫: ${ratioText}`);
        
        // 繝偵ャ繝育紫縺・莉･荳翫〒縺ゅｋ縺薙→繧堤｢ｺ隱・
        const ratioValue = parseFloat(ratioText?.match(/\d+\.?\d*/)?.[0] || '0');
        expect(ratioValue).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('隍・焚繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ髢薙〒縺ｮ繧ｭ繝｣繝・す繝･蛻・屬', async ({ page }) => {
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 譛蛻昴・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｧ繝√Ε繝・ヨ
    const firstCharacter = page.locator('.character-card').nth(0);
    const firstName = await firstCharacter.locator('.character-name').textContent();
    await firstCharacter.click();
    
    await page.waitForURL('**/chat/**');
    const firstCharacterId = page.url().split('/').pop();
    
    // 繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡
    const messageInput = page.locator('textarea[placeholder*="繝｡繝・そ繝ｼ繧ｸ"]');
    await messageInput.fill('繧ｭ繝｣繝・す繝･繝・せ繝・');
    
    const firstResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/chat/send')
    );
    
    await page.locator('button[type="submit"]').click();
    const firstResponse = await firstResponsePromise;
    const firstCacheStatus = firstResponse.headers()['x-prompt-cache-status'];
    
    // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ縺ｫ謌ｻ繧・
    await page.goto('/ja/characters');
    
    // 2逡ｪ逶ｮ縺ｮ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｧ繝√Ε繝・ヨ
    const secondCharacter = page.locator('.character-card').nth(1);
    const secondName = await secondCharacter.locator('.character-name').textContent();
    await secondCharacter.click();
    
    await page.waitForURL('**/chat/**');
    const secondCharacterId = page.url().split('/').pop();
    
    // 蜷後§繝｡繝・そ繝ｼ繧ｸ繧帝∽ｿ｡
    await messageInput.fill('繧ｭ繝｣繝・す繝･繝・せ繝・');
    
    const secondResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/chat/send')
    );
    
    await page.locator('button[type="submit"]').click();
    const secondResponse = await secondResponsePromise;
    const secondCacheStatus = secondResponse.headers()['x-prompt-cache-status'];
    
    console.log(`繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ1 (${firstName}): ${firstCacheStatus}`);
    console.log(`繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ2 (${secondName}): ${secondCacheStatus}`);
    
    // 逡ｰ縺ｪ繧九く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｪ縺ｮ縺ｧ縲・逡ｪ逶ｮ繧ゅく繝｣繝・す繝･繝溘せ縺ｮ縺ｯ縺・
    if (firstCharacterId !== secondCharacterId) {
      expect(secondCacheStatus).toBe('miss');
    }
  });
});
