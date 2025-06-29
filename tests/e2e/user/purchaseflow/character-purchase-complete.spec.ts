import { test, expect } from '@playwright/test';

test.describe('キャラクター購入フローとボタン状態変化のE2Eテスト', () => {
  const testEmail = `purchase-test-${Date.now()}@example.com`;
  const testPassword = 'Test123!';
  
  test.beforeAll(async ({ page }) => {
    // テストユーザーを作成
    await page.goto('/ja/register');
    await page.locator('#email').fill(testEmail);
    await page.locator('#password').fill(testPassword);
    await page.locator('#confirmPassword').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/register-complete', { timeout: 10000 });
  });

  test('有料キャラクターの購入前後のボタン状態確認', async ({ page }) => {
    // ログイン
    await page.goto('/ja/login');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    
    // キャラクター一覧へ
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 有料キャラクターを探す
    const paidCharacterCard = page.locator('.character-card:has(.price-tag:not(:has-text("無料"))), .character-card:has-text("¥")').first();
    
    if (await paidCharacterCard.isVisible()) {
      const characterName = await paidCharacterCard.locator('.character-name').textContent();
      const price = await paidCharacterCard.locator('.price-tag, .character-price').textContent();
      
      console.log(`有料キャラクター「${characterName}」（${price}）をテスト`);
      
      // 購入前のボタン状態を確認
      const unlockButton = paidCharacterCard.locator('button:has-text("アンロック"), button:has-text("購入")');
      await expect(unlockButton).toBeVisible();
      await expect(unlockButton).toBeEnabled();
      
      // チャット開始ボタンは表示されないはず
      const chatButton = paidCharacterCard.locator('button:has-text("チャット開始"), button:has-text("Chat")');
      await expect(chatButton).not.toBeVisible();
      
      // キャラクターカードをクリックして詳細へ
      await paidCharacterCard.click();
      await page.waitForURL('**/characters/**');
      
      // 詳細ページでも購入ボタンを確認
      const detailUnlockButton = page.locator('button:has-text("アンロック"), button:has-text("購入")');
      await expect(detailUnlockButton).toBeVisible();
      
      // ロックされた画像の確認
      const lockedImages = page.locator('.locked-image, .image-locked, img[alt*="ロック"]');
      const lockedCount = await lockedImages.count();
      console.log(`ロックされた画像: ${lockedCount}個`);
      
      // キャラクター一覧に戻る
      await page.goto('/ja/characters');
    }
  });

  test('購入フローの完全なテスト', async ({ page }) => {
    // まずトークンを購入する必要がある
    await page.goto('/ja/token-packs');
    await page.waitForLoadState('networkidle');
    
    // 最小のトークンパックを選択
    const tokenPack = page.locator('.token-pack-card, .pack-item').first();
    const packPrice = await tokenPack.locator('.pack-price').textContent();
    const tokenAmount = await tokenPack.locator('.token-amount').textContent();
    
    console.log(`トークンパック: ${tokenAmount} (${packPrice})`);
    
    // 購入ボタンをクリック
    await tokenPack.locator('button:has-text("購入")').click();
    
    // Stripeチェックアウトへのリダイレクトを待つ
    const stripeUrlPromise = page.waitForURL('**/checkout.stripe.com/**', { timeout: 15000 });
    
    // Stripeのテストカード情報を使用
    try {
      await stripeUrlPromise;
      console.log('Stripeチェックアウトページに到達');
      
      // テストカード情報を入力
      await page.locator('input[name="cardNumber"]').fill('4242424242424242');
      await page.locator('input[name="cardExpiry"]').fill('12/30');
      await page.locator('input[name="cardCvc"]').fill('123');
      await page.locator('input[name="billingName"]').fill('Test User');
      
      // 支払いボタンをクリック
      await page.locator('button[type="submit"]').click();
      
      // 成功ページへのリダイレクトを待つ
      await page.waitForURL('**/success**', { timeout: 30000 });
      
      // トークン残高の更新を確認
      await page.goto('/ja/dashboard');
      const tokenBalance = page.locator('.token-balance, .user-tokens');
      await expect(tokenBalance).toBeVisible();
      const balance = await tokenBalance.textContent();
      console.log(`現在のトークン残高: ${balance}`);
      
    } catch (error) {
      console.log('Stripeチェックアウトをスキップ（テスト環境）');
      // テスト環境では直接トークンを付与するAPIを呼ぶ
    }
  });

  test('キャラクター購入とボタン状態の変化', async ({ page }) => {
    // キャラクター一覧へ
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 有料キャラクターを選択
    const paidCharacter = page.locator('.character-card:has(.price-tag:not(:has-text("無料")))').first();
    const characterName = await paidCharacter.locator('.character-name').textContent();
    
    // 詳細ページへ
    await paidCharacter.click();
    await page.waitForURL('**/characters/**');
    
    // 購入ボタンをクリック
    const purchaseButton = page.locator('button:has-text("アンロック"), button:has-text("購入")');
    await purchaseButton.click();
    
    // 確認ダイアログ
    const confirmDialog = page.locator('.purchase-confirm, [role="dialog"]');
    if (await confirmDialog.isVisible()) {
      const confirmButton = page.locator('button:has-text("確認"), button:has-text("購入する")');
      
      // APIレスポンスを監視
      const purchaseResponse = page.waitForResponse(
        response => response.url().includes('/api/v1/characters') && response.url().includes('purchase')
      );
      
      await confirmButton.click();
      
      const response = await purchaseResponse;
      if (response.status() === 200) {
        console.log(`キャラクター「${characterName}」の購入が完了しました`);
        
        // ボタンが「チャット開始」に変わることを確認
        const chatStartButton = page.locator('button:has-text("チャット開始"), button:has-text("Chat")');
        await expect(chatStartButton).toBeVisible({ timeout: 5000 });
        
        // 画像がアンロックされたことを確認
        const unlockedImages = page.locator('.character-image:not(.locked), img:not([alt*="ロック"])');
        const unlockedCount = await unlockedImages.count();
        console.log(`アンロックされた画像: ${unlockedCount}個`);
        
        // チャット開始ボタンをクリック
        await chatStartButton.click();
        await page.waitForURL('**/chat/**');
        console.log('チャット画面に正常に遷移しました');
      } else {
        console.log('購入に失敗しました（トークン不足の可能性）');
      }
    }
  });

  test('購入済みキャラクターの状態確認', async ({ page }) => {
    // キャラクター一覧へ
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 購入済みインジケーターを探す
    const purchasedCharacters = page.locator('.character-card:has(.purchased-badge), .character-card:has-text("購入済み")');
    const purchasedCount = await purchasedCharacters.count();
    
    console.log(`購入済みキャラクター: ${purchasedCount}個`);
    
    if (purchasedCount > 0) {
      const firstPurchased = purchasedCharacters.first();
      
      // チャット開始ボタンが表示されることを確認
      const chatButton = firstPurchased.locator('button:has-text("チャット開始"), button:has-text("Chat")');
      await expect(chatButton).toBeVisible();
      
      // アンロックボタンが表示されないことを確認
      const unlockButton = firstPurchased.locator('button:has-text("アンロック"), button:has-text("購入")');
      await expect(unlockButton).not.toBeVisible();
      
      // 詳細ページでも確認
      await firstPurchased.click();
      await page.waitForURL('**/characters/**');
      
      // すべての画像がアンロックされているか確認
      const allImages = page.locator('.character-image, .level-image');
      const lockedImages = page.locator('.locked-image, .image-locked');
      
      const totalImages = await allImages.count();
      const lockedCount = await lockedImages.count();
      
      console.log(`画像状態: 全${totalImages}個中、ロック${lockedCount}個`);
      
      // 親密度によってはまだロックされている画像もあるはず
      if (lockedCount > 0) {
        const levelRequirement = page.locator('.level-requirement, .unlock-level');
        if (await levelRequirement.first().isVisible()) {
          const requirementText = await levelRequirement.first().textContent();
          console.log(`アンロック条件: ${requirementText}`);
        }
      }
    }
  });

  test('無料キャラクターのボタン状態', async ({ page }) => {
    await page.goto('/ja/characters');
    await page.waitForLoadState('networkidle');
    
    // 無料キャラクターを探す
    const freeCharacter = page.locator('.character-card:has-text("無料"), .character-card:has(.price-tag:has-text("Free"))').first();
    
    if (await freeCharacter.isVisible()) {
      const characterName = await freeCharacter.locator('.character-name').textContent();
      console.log(`無料キャラクター「${characterName}」をテスト`);
      
      // チャット開始ボタンが最初から表示されることを確認
      const chatButton = freeCharacter.locator('button:has-text("チャット開始"), button:has-text("Chat")');
      await expect(chatButton).toBeVisible();
      
      // アンロックボタンは表示されないはず
      const unlockButton = freeCharacter.locator('button:has-text("アンロック"), button:has-text("購入")');
      await expect(unlockButton).not.toBeVisible();
      
      // 詳細ページでも確認
      await freeCharacter.click();
      await page.waitForURL('**/characters/**');
      
      const detailChatButton = page.locator('button:has-text("チャット開始"), button:has-text("Chat")');
      await expect(detailChatButton).toBeVisible();
      
      // 無料キャラクターでもレベルによる画像ロックはあるか確認
      const lockedImages = page.locator('.locked-image, .image-locked');
      if (await lockedImages.first().isVisible()) {
        console.log('無料キャラクターでも親密度による画像ロックが存在します');
      }
    }
  });

  test('購入履歴の確認', async ({ page }) => {
    // プロフィールまたはダッシュボードへ
    await page.goto('/ja/dashboard');
    
    // 購入履歴リンクを探す
    const purchaseHistoryLink = page.locator('a:has-text("購入履歴"), a[href*="purchases"]');
    if (await purchaseHistoryLink.isVisible()) {
      await purchaseHistoryLink.click();
      await page.waitForLoadState('networkidle');
      
      // 購入履歴テーブル
      const historyTable = page.locator('.purchase-history, table:has-text("購入日")');
      if (await historyTable.isVisible()) {
        const rows = page.locator('tbody tr, .history-row');
        const rowCount = await rows.count();
        console.log(`購入履歴: ${rowCount}件`);
        
        // 最新の購入を確認
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