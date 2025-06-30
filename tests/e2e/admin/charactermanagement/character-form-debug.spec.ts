import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝輔か繝ｼ繝縺ｮ繝・ヰ繝・げ', () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('繝輔か繝ｼ繝隕∫ｴ繧定ｩｳ邏ｰ縺ｫ遒ｺ隱・, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('剥 繝輔か繝ｼ繝讒矩縺ｮ隧ｳ邏ｰ繝・ヰ繝・げ髢句ｧ・);
    
    try {
      // 繝ｭ繧ｰ繧､繝ｳ
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
      
      await page.waitForTimeout(5000);
      await page.close();
      
      // 譁ｰ縺励＞繝壹・繧ｸ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｸ
      const newPage = await context.newPage();
      await newPage.goto('/admin/characters/new');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
      await newPage.screenshot({ path: 'character-form-debug.png', fullPage: true });
      console.log('萄 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ菫晏ｭ・ character-form-debug.png');
      
      // 1. 縺吶∋縺ｦ縺ｮinput隕∫ｴ繧堤｢ｺ隱・
      console.log('\n統 INPUT隕∫ｴ縺ｮ隧ｳ邏ｰ:');
      const allInputs = await newPage.locator('input').all();
      console.log(`邱淑nput隕∫ｴ謨ｰ: ${allInputs.length}`);
      
      for (let i = 0; i < allInputs.length; i++) {
        const input = allInputs[i];
        const type = await input.getAttribute('type');
        const name = await input.getAttribute('name');
        const placeholder = await input.getAttribute('placeholder');
        const id = await input.getAttribute('id');
        const isVisible = await input.isVisible();
        
        console.log(`[${i}] type="${type}" name="${name}" id="${id}" placeholder="${placeholder}" visible=${isVisible}`);
      }
      
      // 2. text蝙九・input縺ｮ縺ｿ
      console.log('\n統 TEXT蝙紀NPUT隕∫ｴ:');
      const textInputs = await newPage.locator('input[type="text"]').all();
      console.log(`text蝙喫nput謨ｰ: ${textInputs.length}`);
      
      for (let i = 0; i < textInputs.length; i++) {
        const input = textInputs[i];
        const name = await input.getAttribute('name');
        const placeholder = await input.getAttribute('placeholder');
        const label = await input.locator('xpath=../preceding-sibling::label').textContent().catch(() => '');
        
        console.log(`[${i}] name="${name}" placeholder="${placeholder}" label="${label}"`);
      }
      
      // 3. 縺吶∋縺ｦ縺ｮtextarea隕∫ｴ
      console.log('\n統 TEXTAREA隕∫ｴ:');
      const textareas = await newPage.locator('textarea').all();
      console.log(`textarea謨ｰ: ${textareas.length}`);
      
      for (let i = 0; i < textareas.length; i++) {
        const textarea = textareas[i];
        const name = await textarea.getAttribute('name');
        const placeholder = await textarea.getAttribute('placeholder');
        
        console.log(`[${i}] name="${name}" placeholder="${placeholder}"`);
      }
      
      // 4. 縺吶∋縺ｦ縺ｮselect隕∫ｴ
      console.log('\n統 SELECT隕∫ｴ:');
      const selects = await newPage.locator('select').all();
      console.log(`select謨ｰ: ${selects.length}`);
      
      for (let i = 0; i < selects.length; i++) {
        const select = selects[i];
        const name = await select.getAttribute('name');
        const options = await select.locator('option').count();
        
        console.log(`[${i}] name="${name}" options=${options}`);
      }
      
      // 5. 繝輔か繝ｼ繝讒矩繧堤｢ｺ隱・
      console.log('\n搭 繝輔か繝ｼ繝讒矩縺ｮ遒ｺ隱・');
      const forms = await newPage.locator('form').count();
      console.log(`form隕∫ｴ謨ｰ: ${forms}`);
      
      // 6. 隕句・縺励ｒ遒ｺ隱・
      const headings = await newPage.locator('h1, h2, h3').allTextContents();
      console.log('隕句・縺・', headings);
      
      // 7. 蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨・隕ｪ隕∫ｴ繧堤｢ｺ隱・
      console.log('\n剥 蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨・繧ｳ繝ｳ繝・リ讒矩:');
      const fieldContainers = await newPage.locator('.space-y-4 > div, .form-group, [class*="field"]').count();
      console.log(`繝輔ぅ繝ｼ繝ｫ繝峨さ繝ｳ繝・リ謨ｰ: ${fieldContainers}`);
      
    } catch (error) {
      console.error('笶・繧ｨ繝ｩ繝ｼ逋ｺ逕・', error);
      await newPage.screenshot({ path: 'character-form-error.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });
});
