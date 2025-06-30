import { test, expect } from '@playwright/test';

test.describe('繧ｷ繝ｳ繝励Ν縺ｪ逶ｴ謗･繧｢繧ｯ繧ｻ繧ｹ繝・せ繝・, () => {
  test('繝ｭ繧ｰ繧､繝ｳ蠕後∫峩謗･URL縺ｧ繝壹・繧ｸ繧堤｢ｺ隱・, async ({ page }) => {
    // 繝ｭ繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // 繝繝・す繝･繝懊・繝峨ｒ蠕・▽
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('笨・繝ｭ繧ｰ繧､繝ｳ螳御ｺ・);
    
    // 髟ｷ繧√↓蠕・ｩ・
    await page.waitForTimeout(5000);
    
    // 蜷・・繝ｼ繧ｸ繧帝・分縺ｫ遒ｺ隱搾ｼ・avaScript縺ｧ驕ｷ遘ｻ・・
    const pages = [
      { url: '/admin/dashboard', name: '繝繝・す繝･繝懊・繝・ },
      { url: '/admin/characters', name: '繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ' },
      { url: '/admin/characters/new', name: '繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・' }
    ];
    
    for (const pageInfo of pages) {
      console.log(`\n塘 ${pageInfo.name}繧堤｢ｺ隱堺ｸｭ...`);
      
      // JavaScript縺ｧ逶ｴ謗･驕ｷ遘ｻ・医リ繝薙ご繝ｼ繧ｷ繝ｧ繝ｳ遶ｶ蜷医ｒ蝗樣∩・・
      await page.evaluate((url) => {
        window.location.href = url;
      }, pageInfo.url);
      
      // 繝壹・繧ｸ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧貞ｾ・▽
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      console.log(`- URL: ${currentUrl}`);
      console.log(`- 譛溷ｾ・＠縺溘・繝ｼ繧ｸ: ${currentUrl.includes(pageInfo.url) ? '笨・ : '笶・}`);
      
      // 蝓ｺ譛ｬ逧・↑隕∫ｴ繧偵き繧ｦ繝ｳ繝・
      const elements = {
        'input': await page.locator('input').count(),
        'button': await page.locator('button').count(),
        'form': await page.locator('form').count()
      };
      
      console.log('- 隕∫ｴ謨ｰ:', elements);
      
      // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
      await page.screenshot({ path: `${pageInfo.name.replace('/', '-')}.png` });
    }
  });
  
  test('隱崎ｨｼ迥ｶ諷九・遒ｺ隱・, async ({ page }) => {
    // 繝・ヰ繝・げ繧ｨ繝ｳ繝峨・繧､繝ｳ繝医′縺ゅｌ縺ｰ遒ｺ隱・
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // 隱崎ｨｼ迥ｶ諷九ｒ遒ｺ隱・
    const response = await page.request.get('/api/v1/debug/auth-status').catch(() => null);
    if (response && response.ok()) {
      const authStatus = await response.json();
      console.log('隱崎ｨｼ迥ｶ諷・', authStatus);
    }
    
    // Cookie繧堤｢ｺ隱・
    const cookies = await page.context().cookies();
    console.log('Cookies:', cookies.map(c => ({ name: c.name, httpOnly: c.httpOnly, secure: c.secure })));
  });
});
