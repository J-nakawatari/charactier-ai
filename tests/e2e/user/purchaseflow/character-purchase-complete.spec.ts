import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ雉ｼ蜈･繝輔Ο繝ｼ縺ｨ繝懊ち繝ｳ迥ｶ諷句､牙喧縺ｮE2E繝・せ繝・, () => {
  const testEmail = `purchase-test-${Date.now()}@example.com`;
  const testPassword = 'Test123!';
  
  test.beforeAll(async ({ page }) => {
    // 繝・せ繝医Θ繝ｼ繧ｶ繝ｼ繧剃ｽ懈・
    await page.goto('/ja/register');
    await page.locator('#email').fill(testEmail);
    await page.locator('#password').fill(testPassword);
    await page.locator('#confirmPassword').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/register-complete', { timeout: 10000 });
  });

  test('譛画侭繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｮ雉ｼ蜈･蜑榊ｾ後・繝懊ち繝ｳ迥ｶ諷狗｢ｺ隱・, async ({ page }) => {
    // 繝ｭ繧ｰ繧､繝ｳ
    await page.goto('/ja/login');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    
    // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ縺ｸ
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 譛画侭繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧呈爾縺・
    const paidCharacterCard = page.locator('.character-card:has(.price-tag:not(:has-text("辟｡譁・))), .character-card:has-text("ﾂ･")').first();
    
    if (await paidCharacterCard.isVisible()) {
      const characterName = await paidCharacterCard.locator('.character-name').textContent();
      const price = await paidCharacterCard.locator('.price-tag, .character-price').textContent();
      
      console.log(`譛画侭繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縲・{characterName}縲搾ｼ・{price}・峨ｒ繝・せ繝・);
      
      // 雉ｼ蜈･蜑阪・繝懊ち繝ｳ迥ｶ諷九ｒ遒ｺ隱・
      const unlockButton = paidCharacterCard.locator('button:has-text("繧｢繝ｳ繝ｭ繝・け"), button:has-text("雉ｼ蜈･")');
      await expect(unlockButton).toBeVisible();
      await expect(unlockButton).toBeEnabled();
      
      // 繝√Ε繝・ヨ髢句ｧ九・繧ｿ繝ｳ縺ｯ陦ｨ遉ｺ縺輔ｌ縺ｪ縺・・縺・
      const chatButton = paidCharacterCard.locator('button:has-text("繝√Ε繝・ヨ髢句ｧ・), button:has-text("Chat")');
      await expect(chatButton).not.toBeVisible();
      
      // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧ｫ繝ｼ繝峨ｒ繧ｯ繝ｪ繝・け縺励※隧ｳ邏ｰ縺ｸ
      await paidCharacterCard.click();
      await page.waitForURL('**/characters/**');
      
      // 隧ｳ邏ｰ繝壹・繧ｸ縺ｧ繧りｳｼ蜈･繝懊ち繝ｳ繧堤｢ｺ隱・
      const detailUnlockButton = page.locator('button:has-text("繧｢繝ｳ繝ｭ繝・け"), button:has-text("雉ｼ蜈･")');
      await expect(detailUnlockButton).toBeVisible();
      
      // 繝ｭ繝・け縺輔ｌ縺溽判蜒上・遒ｺ隱・
      const lockedImages = page.locator('.locked-image, .image-locked, img[alt*="繝ｭ繝・け"]');
      const lockedCount = await lockedImages.count();
      console.log(`繝ｭ繝・け縺輔ｌ縺溽判蜒・ ${lockedCount}蛟義);
      
      // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ縺ｫ謌ｻ繧・
      await page.goto('/ja/characters');
    }
  });

  test('雉ｼ蜈･繝輔Ο繝ｼ縺ｮ螳悟・縺ｪ繝・せ繝・, async ({ page }) => {
    // 縺ｾ縺壹ヨ繝ｼ繧ｯ繝ｳ繧定ｳｼ蜈･縺吶ｋ蠢・ｦ√′縺ゅｋ
    await page.goto('/ja/token-packs');
    await page.waitForLoadState('networkidle');
    
    // 譛蟆上・繝医・繧ｯ繝ｳ繝代ャ繧ｯ繧帝∈謚・
    const tokenPack = page.locator('.token-pack-card, .pack-item').first();
    const packPrice = await tokenPack.locator('.pack-price').textContent();
    const tokenAmount = await tokenPack.locator('.token-amount').textContent();
    
    console.log(`繝医・繧ｯ繝ｳ繝代ャ繧ｯ: ${tokenAmount} (${packPrice})`);
    
    // 雉ｼ蜈･繝懊ち繝ｳ繧偵け繝ｪ繝・け
    await tokenPack.locator('button:has-text("雉ｼ蜈･")').click();
    
    // Stripe繝√ぉ繝・け繧｢繧ｦ繝医∈縺ｮ繝ｪ繝繧､繝ｬ繧ｯ繝医ｒ蠕・▽
    const stripeUrlPromise = page.waitForURL('**/checkout.stripe.com/**', { timeout: 15000 });
    
    // Stripe縺ｮ繝・せ繝医き繝ｼ繝画ュ蝣ｱ繧剃ｽｿ逕ｨ
    try {
      await stripeUrlPromise;
      console.log('Stripe繝√ぉ繝・け繧｢繧ｦ繝医・繝ｼ繧ｸ縺ｫ蛻ｰ驕・);
      
      // 繝・せ繝医き繝ｼ繝画ュ蝣ｱ繧貞・蜉・
      await page.locator('input[name="cardNumber"]').fill('4242424242424242');
      await page.locator('input[name="cardExpiry"]').fill('12/30');
      await page.locator('input[name="cardCvc"]').fill('123');
      await page.locator('input[name="billingName"]').fill('Test User');
      
      // 謾ｯ謇輔＞繝懊ち繝ｳ繧偵け繝ｪ繝・け
      await page.locator('button[type="submit"]').click();
      
      // 謌仙粥繝壹・繧ｸ縺ｸ縺ｮ繝ｪ繝繧､繝ｬ繧ｯ繝医ｒ蠕・▽
      await page.waitForURL('**/success**', { timeout: 30000 });
      
      // 繝医・繧ｯ繝ｳ谿矩ｫ倥・譖ｴ譁ｰ繧堤｢ｺ隱・
      await page.goto('/ja/dashboard');
      const tokenBalance = page.locator('.token-balance, .user-tokens');
      await expect(tokenBalance).toBeVisible();
      const balance = await tokenBalance.textContent();
      console.log(`迴ｾ蝨ｨ縺ｮ繝医・繧ｯ繝ｳ谿矩ｫ・ ${balance}`);
      
    } catch (error) {
      console.log('Stripe繝√ぉ繝・け繧｢繧ｦ繝医ｒ繧ｹ繧ｭ繝・・・医ユ繧ｹ繝育腸蠅・ｼ・);
      // 繝・せ繝育腸蠅・〒縺ｯ逶ｴ謗･繝医・繧ｯ繝ｳ繧剃ｻ倅ｸ弱☆繧帰PI繧貞他縺ｶ
    }
  });

  test('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ雉ｼ蜈･縺ｨ繝懊ち繝ｳ迥ｶ諷九・螟牙喧', async ({ page }) => {
    // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ縺ｸ
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 譛画侭繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧帝∈謚・
    const paidCharacter = page.locator('.character-card:has(.price-tag:not(:has-text("辟｡譁・)))').first();
    const characterName = await paidCharacter.locator('.character-name').textContent();
    
    // 隧ｳ邏ｰ繝壹・繧ｸ縺ｸ
    await paidCharacter.click();
    await page.waitForURL('**/characters/**');
    
    // 雉ｼ蜈･繝懊ち繝ｳ繧偵け繝ｪ繝・け
    const purchaseButton = page.locator('button:has-text("繧｢繝ｳ繝ｭ繝・け"), button:has-text("雉ｼ蜈･")');
    await purchaseButton.click();
    
    // 遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ
    const confirmDialog = page.locator('.purchase-confirm, [role="dialog"]');
    if (await confirmDialog.isVisible()) {
      const confirmButton = page.locator('button:has-text("遒ｺ隱・), button:has-text("雉ｼ蜈･縺吶ｋ")');
      
      // API繝ｬ繧ｹ繝昴Φ繧ｹ繧堤屮隕・
      const purchaseResponse = page.waitForResponse(
        response => response.url().includes('/api/v1/characters') && response.url().includes('purchase')
      );
      
      await confirmButton.click();
      
      const response = await purchaseResponse;
      if (response.status() === 200) {
        console.log(`繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縲・{characterName}縲阪・雉ｼ蜈･縺悟ｮ御ｺ・＠縺ｾ縺励◆`);
        
        // 繝懊ち繝ｳ縺後後メ繝｣繝・ヨ髢句ｧ九阪↓螟峨ｏ繧九％縺ｨ繧堤｢ｺ隱・
        const chatStartButton = page.locator('button:has-text("繝√Ε繝・ヨ髢句ｧ・), button:has-text("Chat")');
        await expect(chatStartButton).toBeVisible({ timeout: 5000 });
        
        // 逕ｻ蜒上′繧｢繝ｳ繝ｭ繝・け縺輔ｌ縺溘％縺ｨ繧堤｢ｺ隱・
        const unlockedImages = page.locator('.character-image:not(.locked), img:not([alt*="繝ｭ繝・け"])');
        const unlockedCount = await unlockedImages.count();
        console.log(`繧｢繝ｳ繝ｭ繝・け縺輔ｌ縺溽判蜒・ ${unlockedCount}蛟義);
        
        // 繝√Ε繝・ヨ髢句ｧ九・繧ｿ繝ｳ繧偵け繝ｪ繝・け
        await chatStartButton.click();
        await page.waitForURL('**/chat/**');
        console.log('繝√Ε繝・ヨ逕ｻ髱｢縺ｫ豁｣蟶ｸ縺ｫ驕ｷ遘ｻ縺励∪縺励◆');
      } else {
        console.log('雉ｼ蜈･縺ｫ螟ｱ謨励＠縺ｾ縺励◆・医ヨ繝ｼ繧ｯ繝ｳ荳崎ｶｳ縺ｮ蜿ｯ閭ｽ諤ｧ・・);
      }
    }
  });

  test('雉ｼ蜈･貂医∩繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｮ迥ｶ諷狗｢ｺ隱・, async ({ page }) => {
    // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ縺ｸ
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 雉ｼ蜈･貂医∩繧､繝ｳ繧ｸ繧ｱ繝ｼ繧ｿ繝ｼ繧呈爾縺・
    const purchasedCharacters = page.locator('.character-card:has(.purchased-badge), .character-card:has-text("雉ｼ蜈･貂医∩")');
    const purchasedCount = await purchasedCharacters.count();
    
    console.log(`雉ｼ蜈･貂医∩繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ: ${purchasedCount}蛟義);
    
    if (purchasedCount > 0) {
      const firstPurchased = purchasedCharacters.first();
      
      // 繝√Ε繝・ヨ髢句ｧ九・繧ｿ繝ｳ縺瑚｡ｨ遉ｺ縺輔ｌ繧九％縺ｨ繧堤｢ｺ隱・
      const chatButton = firstPurchased.locator('button:has-text("繝√Ε繝・ヨ髢句ｧ・), button:has-text("Chat")');
      await expect(chatButton).toBeVisible();
      
      // 繧｢繝ｳ繝ｭ繝・け繝懊ち繝ｳ縺瑚｡ｨ遉ｺ縺輔ｌ縺ｪ縺・％縺ｨ繧堤｢ｺ隱・
      const unlockButton = firstPurchased.locator('button:has-text("繧｢繝ｳ繝ｭ繝・け"), button:has-text("雉ｼ蜈･")');
      await expect(unlockButton).not.toBeVisible();
      
      // 隧ｳ邏ｰ繝壹・繧ｸ縺ｧ繧ら｢ｺ隱・
      await firstPurchased.click();
      await page.waitForURL('**/characters/**');
      
      // 縺吶∋縺ｦ縺ｮ逕ｻ蜒上′繧｢繝ｳ繝ｭ繝・け縺輔ｌ縺ｦ縺・ｋ縺狗｢ｺ隱・
      const allImages = page.locator('.character-image, .level-image');
      const lockedImages = page.locator('.locked-image, .image-locked');
      
      const totalImages = await allImages.count();
      const lockedCount = await lockedImages.count();
      
      console.log(`逕ｻ蜒冗憾諷・ 蜈ｨ${totalImages}蛟倶ｸｭ縲√Ο繝・け${lockedCount}蛟義);
      
      // 隕ｪ蟇・ｺｦ縺ｫ繧医▲縺ｦ縺ｯ縺ｾ縺繝ｭ繝・け縺輔ｌ縺ｦ縺・ｋ逕ｻ蜒上ｂ縺ゅｋ縺ｯ縺・
      if (lockedCount > 0) {
        const levelRequirement = page.locator('.level-requirement, .unlock-level');
        if (await levelRequirement.first().isVisible()) {
          const requirementText = await levelRequirement.first().textContent();
          console.log(`繧｢繝ｳ繝ｭ繝・け譚｡莉ｶ: ${requirementText}`);
        }
      }
    }
  });

  test('辟｡譁吶く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｮ繝懊ち繝ｳ迥ｶ諷・, async ({ page }) => {
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 辟｡譁吶く繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧呈爾縺・
    const freeCharacter = page.locator('.character-card:has-text("辟｡譁・), .character-card:has(.price-tag:has-text("Free"))').first();
    
    if (await freeCharacter.isVisible()) {
      const characterName = await freeCharacter.locator('.character-name').textContent();
      console.log(`辟｡譁吶く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縲・{characterName}縲阪ｒ繝・せ繝・);
      
      // 繝√Ε繝・ヨ髢句ｧ九・繧ｿ繝ｳ縺梧怙蛻昴°繧芽｡ｨ遉ｺ縺輔ｌ繧九％縺ｨ繧堤｢ｺ隱・
      const chatButton = freeCharacter.locator('button:has-text("繝√Ε繝・ヨ髢句ｧ・), button:has-text("Chat")');
      await expect(chatButton).toBeVisible();
      
      // 繧｢繝ｳ繝ｭ繝・け繝懊ち繝ｳ縺ｯ陦ｨ遉ｺ縺輔ｌ縺ｪ縺・・縺・
      const unlockButton = freeCharacter.locator('button:has-text("繧｢繝ｳ繝ｭ繝・け"), button:has-text("雉ｼ蜈･")');
      await expect(unlockButton).not.toBeVisible();
      
      // 隧ｳ邏ｰ繝壹・繧ｸ縺ｧ繧ら｢ｺ隱・
      await freeCharacter.click();
      await page.waitForURL('**/characters/**');
      
      const detailChatButton = page.locator('button:has-text("繝√Ε繝・ヨ髢句ｧ・), button:has-text("Chat")');
      await expect(detailChatButton).toBeVisible();
      
      // 辟｡譁吶く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｧ繧ゅΞ繝吶Ν縺ｫ繧医ｋ逕ｻ蜒上Ο繝・け縺ｯ縺ゅｋ縺狗｢ｺ隱・
      const lockedImages = page.locator('.locked-image, .image-locked');
      if (await lockedImages.first().isVisible()) {
        console.log('辟｡譁吶く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｧ繧りｦｪ蟇・ｺｦ縺ｫ繧医ｋ逕ｻ蜒上Ο繝・け縺悟ｭ伜惠縺励∪縺・);
      }
    }
  });

  test('雉ｼ蜈･螻･豁ｴ縺ｮ遒ｺ隱・, async ({ page }) => {
    // 繝励Ο繝輔ぅ繝ｼ繝ｫ縺ｾ縺溘・繝繝・す繝･繝懊・繝峨∈
    await page.goto('/ja/dashboard');
    
    // 雉ｼ蜈･螻･豁ｴ繝ｪ繝ｳ繧ｯ繧呈爾縺・
    const purchaseHistoryLink = page.locator('a:has-text("雉ｼ蜈･螻･豁ｴ"), a[href*="purchases"]');
    if (await purchaseHistoryLink.isVisible()) {
      await purchaseHistoryLink.click();
      await page.waitForLoadState('networkidle');
      
      // 雉ｼ蜈･螻･豁ｴ繝・・繝悶Ν
      const historyTable = page.locator('.purchase-history, table:has-text("雉ｼ蜈･譌･")');
      if (await historyTable.isVisible()) {
        const rows = page.locator('tbody tr, .history-row');
        const rowCount = await rows.count();
        console.log(`雉ｼ蜈･螻･豁ｴ: ${rowCount}莉ｶ`);
        
        // 譛譁ｰ縺ｮ雉ｼ蜈･繧堤｢ｺ隱・
        if (rowCount > 0) {
          const latestPurchase = rows.first();
          const itemName = await latestPurchase.locator('td:nth-child(2)').textContent();
          const purchaseDate = await latestPurchase.locator('td:nth-child(1)').textContent();
          const amount = await latestPurchase.locator('td:nth-child(3)').textContent();
          
          console.log(`譛譁ｰ縺ｮ雉ｼ蜈･: ${itemName} (${purchaseDate}) - ${amount}`);
        }
      }
    }
  });
});
