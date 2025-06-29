import { test, expect } from '@playwright/test';

test.describe('キャラクター作成フォームのデバッグ', () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('フォーム要素を詳細に確認', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🔍 フォーム構造の詳細デバッグ開始');
    
    try {
      // ログイン
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('✅ ログイン成功');
      
      await page.waitForTimeout(5000);
      await page.close();
      
      // 新しいページでキャラクター作成ページへ
      const newPage = await context.newPage();
      await newPage.goto('/admin/characters/new');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      // スクリーンショット
      await newPage.screenshot({ path: 'character-form-debug.png', fullPage: true });
      console.log('📸 スクリーンショット保存: character-form-debug.png');
      
      // 1. すべてのinput要素を確認
      console.log('\n📝 INPUT要素の詳細:');
      const allInputs = await newPage.locator('input').all();
      console.log(`総input要素数: ${allInputs.length}`);
      
      for (let i = 0; i < allInputs.length; i++) {
        const input = allInputs[i];
        const type = await input.getAttribute('type');
        const name = await input.getAttribute('name');
        const placeholder = await input.getAttribute('placeholder');
        const id = await input.getAttribute('id');
        const isVisible = await input.isVisible();
        
        console.log(`[${i}] type="${type}" name="${name}" id="${id}" placeholder="${placeholder}" visible=${isVisible}`);
      }
      
      // 2. text型のinputのみ
      console.log('\n📝 TEXT型INPUT要素:');
      const textInputs = await newPage.locator('input[type="text"]').all();
      console.log(`text型input数: ${textInputs.length}`);
      
      for (let i = 0; i < textInputs.length; i++) {
        const input = textInputs[i];
        const name = await input.getAttribute('name');
        const placeholder = await input.getAttribute('placeholder');
        const label = await input.locator('xpath=../preceding-sibling::label').textContent().catch(() => '');
        
        console.log(`[${i}] name="${name}" placeholder="${placeholder}" label="${label}"`);
      }
      
      // 3. すべてのtextarea要素
      console.log('\n📝 TEXTAREA要素:');
      const textareas = await newPage.locator('textarea').all();
      console.log(`textarea数: ${textareas.length}`);
      
      for (let i = 0; i < textareas.length; i++) {
        const textarea = textareas[i];
        const name = await textarea.getAttribute('name');
        const placeholder = await textarea.getAttribute('placeholder');
        
        console.log(`[${i}] name="${name}" placeholder="${placeholder}"`);
      }
      
      // 4. すべてのselect要素
      console.log('\n📝 SELECT要素:');
      const selects = await newPage.locator('select').all();
      console.log(`select数: ${selects.length}`);
      
      for (let i = 0; i < selects.length; i++) {
        const select = selects[i];
        const name = await select.getAttribute('name');
        const options = await select.locator('option').count();
        
        console.log(`[${i}] name="${name}" options=${options}`);
      }
      
      // 5. フォーム構造を確認
      console.log('\n📋 フォーム構造の確認:');
      const forms = await newPage.locator('form').count();
      console.log(`form要素数: ${forms}`);
      
      // 6. 見出しを確認
      const headings = await newPage.locator('h1, h2, h3').allTextContents();
      console.log('見出し:', headings);
      
      // 7. 入力フィールドの親要素を確認
      console.log('\n🔍 入力フィールドのコンテナ構造:');
      const fieldContainers = await newPage.locator('.space-y-4 > div, .form-group, [class*="field"]').count();
      console.log(`フィールドコンテナ数: ${fieldContainers}`);
      
    } catch (error) {
      console.error('❌ エラー発生:', error);
      await newPage.screenshot({ path: 'character-form-error.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });
});