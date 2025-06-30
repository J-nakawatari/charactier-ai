import { test, expect } from '@playwright/test';

test.describe('キャラクター作�Eフォーム直接アクセス', () => {
  test('直接URLでキャラクター作�Eペ�Eジにアクセス', async ({ page }) => {
    console.log('🚀 チE��ト開姁E キャラクター作�Eフォーム直接アクセス');
    
    // Step 1: ログイン
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button[type="submit"]').click();
    
    // ログイン後�Eリダイレクトを征E��
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    console.log('✁Eログイン成功');
    
    // Step 2: ダチE��ュボ�Eドが完�Eに読み込まれるまで征E��
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 追加の安�Eな征E��E
    
    // Step 3: 新しいタブで開くのと同じように、完�Eに新しいナビゲーションとして処琁E
    await page.evaluate(() => {
      window.location.href = '/admin/characters/new';
    });
    
    // ペ�Eジの読み込みを征E��
    await page.waitForURL('**/admin/characters/new', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    console.log('✁Eキャラクター作�Eペ�Eジに到遁E);
    console.log('📍 現在のURL:', page.url());
    
    // Step 4: フォームフィールド�E確誁E
    console.log('\n📝 フォームフィールド�E確誁E');
    
    // 基本皁E��フォーム要素の存在を確誁E
    const formElements = {
      'チE��スト�E劁E: 'input[type="text"]',
      'セレクト�EチE��ス': 'select',
      'チェチE��ボックス': 'input[type="checkbox"]',
      'チE��ストエリア': 'textarea',
      '保存�Eタン': 'button[type="submit"], button:has-text("保孁E), button:has-text("作�E")'
    };
    
    for (const [name, selector] of Object.entries(formElements)) {
      const count = await page.locator(selector).count();
      console.log(`- ${name}: ${count}個`);
    }
    
    // Step 5: 忁E��フィールド�EチE��ト�E劁E
    try {
      // 名前フィールドに入劁E
      const nameInput = page.locator('input[type="text"]').first();
      await nameInput.fill('チE��トキャラクター');
      console.log('✁E名前フィールドに入劁E);
      
      // 性格プリセチE��を選抁E
      const selectBox = page.locator('select').first();
      if (await selectBox.isVisible()) {
        const options = await selectBox.locator('option').allTextContents();
        console.log('性格プリセチE��のオプション:', options.slice(0, 5)); // 最初�E5個を表示
        
        if (options.length > 1) {
          await selectBox.selectOption({ index: 1 });
          console.log('✁E性格プリセチE��を選抁E);
        }
      }
      
      // 性格タグを選抁E
      const checkbox = page.locator('input[type="checkbox"]').first();
      if (await checkbox.isVisible()) {
        await checkbox.click();
        console.log('✁E性格タグを選抁E);
      }
      
    } catch (error) {
      console.log('⚠�E�Eフォームフィールド�E操作中にエラー:', error);
    }
    
    // スクリーンショチE��を保孁E
    await page.screenshot({ path: 'character-form-direct.png', fullPage: true });
    console.log('\n📸 スクリーンショチE��めEcharacter-form-direct.png に保存しました');
  });
});
