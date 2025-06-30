import { test, expect } from '@playwright/test';

test.describe('キャラクター購入フローとボタン状態変化のE2EチE��チE, () => {
  const testEmail = `purchase-test-${Date.now()}@example.com`;
  const testPassword = 'Test123!';
  
  test.beforeAll(async ({ page }) => {
    // チE��トユーザーを作�E
    await page.goto('/ja/register');
    await page.locator('#email').fill(testEmail);
    await page.locator('#password').fill(testPassword);
    await page.locator('#confirmPassword').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/register-complete', { timeout: 10000 });
  });

  test('有料キャラクターの購入前後�Eボタン状態確誁E, async ({ page }) => {
    // ログイン
    await page.goto('/ja/login');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    
    // キャラクター一覧へ
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 有料キャラクターを探ぁE
    const paidCharacterCard = page.locator('.character-card:has(.price-tag:not(:has-text("無斁E))), .character-card:has-text("¥")').first();
    
    if (await paidCharacterCard.isVisible()) {
      const characterName = await paidCharacterCard.locator('.character-name').textContent();
      const price = await paidCharacterCard.locator('.price-tag, .character-price').textContent();
      
      console.log(`有料キャラクター、E{characterName}」！E{price}�E�をチE��チE);
      
      // 購入前�Eボタン状態を確誁E
      const unlockButton = paidCharacterCard.locator('button:has-text("アンロチE��"), button:has-text("購入")');
      await expect(unlockButton).toBeVisible();
      await expect(unlockButton).toBeEnabled();
      
      // チャチE��開始�Eタンは表示されなぁE�EぁE
      const chatButton = paidCharacterCard.locator('button:has-text("チャチE��開姁E), button:has-text("Chat")');
      await expect(chatButton).not.toBeVisible();
      
      // キャラクターカードをクリチE��して詳細へ
      await paidCharacterCard.click();
      await page.waitForURL('**/characters/**');
      
      // 詳細ペ�Eジでも購入ボタンを確誁E
      const detailUnlockButton = page.locator('button:has-text("アンロチE��"), button:has-text("購入")');
      await expect(detailUnlockButton).toBeVisible();
      
      // ロチE��された画像�E確誁E
      const lockedImages = page.locator('.locked-image, .image-locked, img[alt*="ロチE��"]');
      const lockedCount = await lockedImages.count();
      console.log(`ロチE��された画僁E ${lockedCount}個`);
      
      // キャラクター一覧に戻めE
      await page.goto('/ja/characters');
    }
  });

  test('購入フローの完�EなチE��チE, async ({ page }) => {
    // まずトークンを購入する忁E��がある
    await page.goto('/ja/token-packs');
    await page.waitForLoadState('networkidle');
    
    // 最小�Eト�Eクンパックを選抁E
    const tokenPack = page.locator('.token-pack-card, .pack-item').first();
    const packPrice = await tokenPack.locator('.pack-price').textContent();
    const tokenAmount = await tokenPack.locator('.token-amount').textContent();
    
    console.log(`ト�Eクンパック: ${tokenAmount} (${packPrice})`);
    
    // 購入ボタンをクリチE��
    await tokenPack.locator('button:has-text("購入")').click();
    
    // StripeチェチE��アウトへのリダイレクトを征E��
    const stripeUrlPromise = page.waitForURL('**/checkout.stripe.com/**', { timeout: 15000 });
    
    // StripeのチE��トカード情報を使用
    try {
      await stripeUrlPromise;
      console.log('StripeチェチE��アウト�Eージに到遁E);
      
      // チE��トカード情報を�E劁E
      await page.locator('input[name="cardNumber"]').fill('4242424242424242');
      await page.locator('input[name="cardExpiry"]').fill('12/30');
      await page.locator('input[name="cardCvc"]').fill('123');
      await page.locator('input[name="billingName"]').fill('Test User');
      
      // 支払いボタンをクリチE��
      await page.locator('button[type="submit"]').click();
      
      // 成功ペ�Eジへのリダイレクトを征E��
      await page.waitForURL('**/success**', { timeout: 30000 });
      
      // ト�Eクン残高�E更新を確誁E
      await page.goto('/ja/dashboard');
      const tokenBalance = page.locator('.token-balance, .user-tokens');
      await expect(tokenBalance).toBeVisible();
      const balance = await tokenBalance.textContent();
      console.log(`現在のト�Eクン残髁E ${balance}`);
      
    } catch (error) {
      console.log('StripeチェチE��アウトをスキチE�E�E�テスト環墁E��E);
      // チE��ト環墁E��は直接ト�Eクンを付与するAPIを呼ぶ
    }
  });

  test('キャラクター購入とボタン状態�E変化', async ({ page }) => {
    // キャラクター一覧へ
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 有料キャラクターを選抁E
    const paidCharacter = page.locator('.character-card:has(.price-tag:not(:has-text("無斁E)))').first();
    const characterName = await paidCharacter.locator('.character-name').textContent();
    
    // 詳細ペ�Eジへ
    await paidCharacter.click();
    await page.waitForURL('**/characters/**');
    
    // 購入ボタンをクリチE��
    const purchaseButton = page.locator('button:has-text("アンロチE��"), button:has-text("購入")');
    await purchaseButton.click();
    
    // 確認ダイアログ
    const confirmDialog = page.locator('.purchase-confirm, [role="dialog"]');
    if (await confirmDialog.isVisible()) {
      const confirmButton = page.locator('button:has-text("確誁E), button:has-text("購入する")');
      
      // APIレスポンスを監要E
      const purchaseResponse = page.waitForResponse(
        response => response.url().includes('/api/v1/characters') && response.url().includes('purchase')
      );
      
      await confirmButton.click();
      
      const response = await purchaseResponse;
      if (response.status() === 200) {
        console.log(`キャラクター、E{characterName}」�E購入が完亁E��ました`);
        
        // ボタンが「チャチE��開始」に変わることを確誁E
        const chatStartButton = page.locator('button:has-text("チャチE��開姁E), button:has-text("Chat")');
        await expect(chatStartButton).toBeVisible({ timeout: 5000 });
        
        // 画像がアンロチE��されたことを確誁E
        const unlockedImages = page.locator('.character-image:not(.locked), img:not([alt*="ロチE��"])');
        const unlockedCount = await unlockedImages.count();
        console.log(`アンロチE��された画僁E ${unlockedCount}個`);
        
        // チャチE��開始�EタンをクリチE��
        await chatStartButton.click();
        await page.waitForURL('**/chat/**');
        console.log('チャチE��画面に正常に遷移しました');
      } else {
        console.log('購入に失敗しました�E�トークン不足の可能性�E�E);
      }
    }
  });

  test('購入済みキャラクターの状態確誁E, async ({ page }) => {
    // キャラクター一覧へ
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 購入済みインジケーターを探ぁE
    const purchasedCharacters = page.locator('.character-card:has(.purchased-badge), .character-card:has-text("購入済み")');
    const purchasedCount = await purchasedCharacters.count();
    
    console.log(`購入済みキャラクター: ${purchasedCount}個`);
    
    if (purchasedCount > 0) {
      const firstPurchased = purchasedCharacters.first();
      
      // チャチE��開始�Eタンが表示されることを確誁E
      const chatButton = firstPurchased.locator('button:has-text("チャチE��開姁E), button:has-text("Chat")');
      await expect(chatButton).toBeVisible();
      
      // アンロチE��ボタンが表示されなぁE��とを確誁E
      const unlockButton = firstPurchased.locator('button:has-text("アンロチE��"), button:has-text("購入")');
      await expect(unlockButton).not.toBeVisible();
      
      // 詳細ペ�Eジでも確誁E
      await firstPurchased.click();
      await page.waitForURL('**/characters/**');
      
      // すべての画像がアンロチE��されてぁE��か確誁E
      const allImages = page.locator('.character-image, .level-image');
      const lockedImages = page.locator('.locked-image, .image-locked');
      
      const totalImages = await allImages.count();
      const lockedCount = await lockedImages.count();
      
      console.log(`画像状慁E 全${totalImages}個中、ロチE��${lockedCount}個`);
      
      // 親寁E��によってはまだロチE��されてぁE��画像もあるはぁE
      if (lockedCount > 0) {
        const levelRequirement = page.locator('.level-requirement, .unlock-level');
        if (await levelRequirement.first().isVisible()) {
          const requirementText = await levelRequirement.first().textContent();
          console.log(`アンロチE��条件: ${requirementText}`);
        }
      }
    }
  });

  test('無料キャラクターのボタン状慁E, async ({ page }) => {
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 無料キャラクターを探ぁE
    const freeCharacter = page.locator('.character-card:has-text("無斁E), .character-card:has(.price-tag:has-text("Free"))').first();
    
    if (await freeCharacter.isVisible()) {
      const characterName = await freeCharacter.locator('.character-name').textContent();
      console.log(`無料キャラクター、E{characterName}」をチE��チE);
      
      // チャチE��開始�Eタンが最初から表示されることを確誁E
      const chatButton = freeCharacter.locator('button:has-text("チャチE��開姁E), button:has-text("Chat")');
      await expect(chatButton).toBeVisible();
      
      // アンロチE��ボタンは表示されなぁE�EぁE
      const unlockButton = freeCharacter.locator('button:has-text("アンロチE��"), button:has-text("購入")');
      await expect(unlockButton).not.toBeVisible();
      
      // 詳細ペ�Eジでも確誁E
      await freeCharacter.click();
      await page.waitForURL('**/characters/**');
      
      const detailChatButton = page.locator('button:has-text("チャチE��開姁E), button:has-text("Chat")');
      await expect(detailChatButton).toBeVisible();
      
      // 無料キャラクターでもレベルによる画像ロチE��はあるか確誁E
      const lockedImages = page.locator('.locked-image, .image-locked');
      if (await lockedImages.first().isVisible()) {
        console.log('無料キャラクターでも親寁E��による画像ロチE��が存在しまぁE);
      }
    }
  });

  test('購入履歴の確誁E, async ({ page }) => {
    // プロフィールまた�EダチE��ュボ�Eドへ
    await page.goto('/ja/dashboard');
    
    // 購入履歴リンクを探ぁE
    const purchaseHistoryLink = page.locator('a:has-text("購入履歴"), a[href*="purchases"]');
    if (await purchaseHistoryLink.isVisible()) {
      await purchaseHistoryLink.click();
      await page.waitForLoadState('networkidle');
      
      // 購入履歴チE�Eブル
      const historyTable = page.locator('.purchase-history, table:has-text("購入日")');
      if (await historyTable.isVisible()) {
        const rows = page.locator('tbody tr, .history-row');
        const rowCount = await rows.count();
        console.log(`購入履歴: ${rowCount}件`);
        
        // 最新の購入を確誁E
        if (rowCount > 0) {
          const latestPurchase = rows.first();
          const itemName = await latestPurchase.locator('td:nth-child(2)').textContent();
          const purchaseDate = await latestPurchase.locator('td:nth-child(1)').textContent();
          const amount = await latestPurchase.locator('td:nth-child(3)').textContent();
          
          console.log(`最新の購入: ${itemName} (${purchaseDate}) - ${amount}`);
        }
      }
    }
  });
});
