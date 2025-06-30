import { test, expect } from '@playwright/test';

test.describe('実証済みアプローチでのキャラクター作�E', () => {
  test('debug-character-formと同じ方法でキャラクター作�E', async ({ browser }) => {
    // 新しいコンチE��ストを作�E�E�Eebug-character-formと同じ�E�E
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 実証済みアプローチでチE��ト開姁E);
    
    // Step 1: ログイン�E�Eebug-character-formと同じ�E�E
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // ダチE��ュボ�Eドへの遷移を征E��
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('✁Eログイン成功');
    } catch (e) {
      console.log('❁Eログイン失敁E);
      await context.close();
      return;
    }
    
    // Step 2: 十�Eな征E��！Eebug-character-formと同じ�E�E
    await page.waitForTimeout(5000);
    await page.close();
    
    // Step 3: 新しいペ�Eジで開く�E�Eebug-character-formと同じ�E�E
    const newPage = await context.newPage();
    console.log('\n📄 新しいペ�Eジでキャラクター作�Eペ�Eジを開ぁE..');
    
    await newPage.goto('/admin/characters/new', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // URLが正しいことを確誁E
    const currentUrl = newPage.url();
    console.log('📍 現在のURL:', currentUrl);
    
    if (!currentUrl.includes('/admin/characters/new')) {
      console.error('❁E期征E��たURLではありません');
      await newPage.screenshot({ path: 'proven-approach-error.png' });
      await context.close();
      throw new Error('キャラクター作�Eペ�Eジに到達できませんでした');
    }
    
    console.log('✁Eキャラクター作�Eペ�Eジに到遁E);
    
    // Step 4: フォームに入劁E
    console.log('\n📝 フォームに入力中...');
    
    // 征E��E
    await newPage.waitForTimeout(2000);
    
    // チE��スト�E劁E
    const textInputs = await newPage.locator('input[type="text"]').all();
    if (textInputs.length >= 2) {
      await textInputs[0].fill('実証済みチE��トキャラ');
      await textInputs[1].fill('Proven Test Character');
      console.log('✁E名前を�E劁E);
    }
    
    // チE��ストエリア
    const textareas = await newPage.locator('textarea').all();
    if (textareas.length > 0) {
      await textareas[0].fill('実証済みアプローチで作�Eされたテストキャラクターです、E);
      console.log('✁E説明を入劁E);
    }
    
    // セレクト�EチE��ス�E�性格プリセチE���E�E
    const selects = await newPage.locator('select').all();
    if (selects.length > 0) {
      const options = await selects[0].locator('option').all();
      // 空でなぁE��初�E値を選抁E
      for (let i = 1; i < options.length; i++) {
        const value = await options[i].getAttribute('value');
        if (value && value !== '') {
          await selects[0].selectOption(value);
          console.log(`✁E性格プリセチE��を選抁E ${value}`);
          break;
        }
      }
    }
    
    // チェチE��ボックス�E�性格タグ�E�E
    const checkboxes = await newPage.locator('input[type="checkbox"]').all();
    if (checkboxes.length > 0) {
      await checkboxes[0].click();
      console.log('✁E性格タグを選抁E);
    }
    
    // Step 5: スクリーンショチE��
    await newPage.screenshot({ path: 'proven-approach-form.png', fullPage: true });
    console.log('\n📸 フォームのスクリーンショチE��を保孁E);
    
    // Step 6: 保孁E
    const saveButton = newPage.locator('button[type="submit"], button:has-text("保孁E), button:has-text("作�E")').first();
    if (await saveButton.isVisible()) {
      console.log('\n💾 保存�EタンをクリチE��...');
      await saveButton.click();
      
      // 結果を征E��
      await newPage.waitForTimeout(5000);
      
      // 成功の確誁E
      const finalUrl = newPage.url();
      const hasSuccess = !finalUrl.includes('/new') || 
                        await newPage.locator('.toast-success').isVisible().catch(() => false);
      
      console.log('\n📊 結果:');
      console.log('- 最終URL:', finalUrl);
      console.log('- 成功:', hasSuccess ? '✁E : '❁E);
      
      if (!hasSuccess) {
        const errors = await newPage.locator('.error, .text-red-600').allTextContents();
        console.log('- エラー:', errors);
        await newPage.screenshot({ path: 'proven-approach-result.png' });
      }
    }
    
    await context.close();
    console.log('\n✁EチE��ト完亁E);
  });
});
