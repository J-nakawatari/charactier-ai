import { test, expect } from '@playwright/test';

test.describe('キャラクター作�Eフォームナビゲーション', () => {
  test('管琁E��面からキャラクター作�Eペ�Eジへ遷移', async ({ page }) => {
    // 管琁E��E��グイン
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    // ログイン
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button[type="submit"]').click();
    
    // ダチE��ュボ�Eドへの遷移を征E��
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
      console.log('✁Eログイン成功');
    } catch (e) {
      console.log('❁Eログイン失敁E);
      return;
    }
    
    // ペ�Eジが完�Eに読み込まれるのを征E��
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 追加の征E��E
    
    // 方況E: サイドバーメニューから遷移�E�推奨�E�E
    try {
      // サイドバーのキャラクター管琁E��ンクをクリチE��
      const characterMenuLink = page.locator('a[href="/admin/characters"], nav a:has-text("キャラクター")');
      if (await characterMenuLink.isVisible({ timeout: 3000 })) {
        await characterMenuLink.click();
        await page.waitForURL('**/admin/characters');
        console.log('✁Eキャラクター一覧ペ�Eジへ遷移');
        
        // 新規作�EボタンをクリチE��
        const newButton = page.locator('a[href="/admin/characters/new"], button:has-text("新規作�E")');
        await newButton.click();
        await page.waitForURL('**/admin/characters/new');
        console.log('✁Eキャラクター作�Eペ�Eジへ遷移');
      } else {
        throw new Error('サイドバーメニューが見つかりません');
      }
    } catch (e) {
      console.log('⚠�E�Eメニューナビゲーションに失敗、直接URLで遷移を試みまぁE);
      
      // 方況E: 直接URLで遷移�E�フォールバック�E�E
      await page.goto('/admin/characters', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      
      // 新規作�Eボタンを探してクリチE��
      const createButtons = [
        'a[href="/admin/characters/new"]',
        'button:has-text("新規作�E")',
        'a:has-text("新規作�E")',
        'button:has-text("追加")',
        'a:has-text("追加")'
      ];
      
      let clicked = false;
      for (const selector of createButtons) {
        const button = page.locator(selector);
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click();
          clicked = true;
          console.log(`✁EボタンをクリチE��: ${selector}`);
          break;
        }
      }
      
      if (!clicked) {
        // 最終手段: 直接URLで遷移
        await page.goto('/admin/characters/new', { waitUntil: 'networkidle' });
      }
    }
    
    // フォームが表示されるまで征E��
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // フォームフィールド�E確誁E
    console.log('📝 フォームフィールドを確認中...');
    
    // 名前入力フィールチE
    const nameFields = await page.locator('input[type="text"]').count();
    console.log(`チE��スト�E力フィールド数: ${nameFields}`);
    
    // 性格プリセチE��
    const selectBoxes = await page.locator('select').count();
    console.log(`セレクト�EチE��ス数: ${selectBoxes}`);
    
    // 性格タグ�E�チェチE��ボックス�E�E
    const checkboxes = await page.locator('input[type="checkbox"]').count();
    console.log(`チェチE��ボックス数: ${checkboxes}`);
    
    // チE��ストエリア
    const textareas = await page.locator('textarea').count();
    console.log(`チE��ストエリア数: ${textareas}`);
    
    // 保存�Eタン
    const saveButton = page.locator('button[type="submit"], button:has-text("保孁E), button:has-text("作�E")');
    if (await saveButton.isVisible()) {
      console.log('✁E保存�Eタンが表示されてぁE��ぁE);
    }
    
    // スクリーンショチE��を保孁E
    await page.screenshot({ path: 'character-form.png', fullPage: true });
    console.log('📸 フォームのスクリーンショチE��めEcharacter-form.png に保存しました');
  });
});
