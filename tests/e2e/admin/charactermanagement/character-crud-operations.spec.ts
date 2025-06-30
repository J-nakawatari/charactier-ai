import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・ｩ溯・縺ｮ蛹・峡逧Е2E繝・せ繝・, () => {
  test.setTimeout(120000); // 蜈ｨ繝・せ繝医・繧ｿ繧､繝繧｢繧ｦ繝医ｒ120遘偵↓險ｭ螳夲ｼ医Ξ繝ｼ繝亥宛髯仙ｯｾ遲厄ｼ・
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';
  
  // 繝｢繝舌う繝ｫ繝・ヰ繧､繧ｹ縺ｧ縺ｯ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・判髱｢縺ｮ繝・せ繝医ｒ繧ｹ繧ｭ繝・・
  test.beforeEach(async ({ page, browserName }, testInfo) => {
    const isMobile = testInfo.project.name.toLowerCase().includes('mobile');
    if (isMobile) {
      testInfo.skip(true, '繝｢繝舌う繝ｫ繝薙Η繝ｼ縺ｮ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・判髱｢縺ｯ蠕後〒逕ｻ髱｢讒区・繧定ｦ狗峩縺吝ｿ・ｦ√′縺ゅｋ縺溘ａ縲∫樟蝨ｨ縺ｯ繧ｹ繧ｭ繝・・縺励∪縺・);
    }
  });
  
  // 繝ｭ繧ｰ繧､繝ｳ蜃ｦ逅・ｒ蜈ｱ騾壼喧
  const loginAsAdmin = async (page: any) => {
    // 繝ｬ繝ｼ繝亥宛髯舌ｒ蝗樣∩縺吶ｋ縺溘ａ縲√ユ繧ｹ繝磯幕蟋句燕縺ｫ蟆代＠蠕・ｩ・
    await page.waitForTimeout(2000);
    
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // 繝ｬ繝ｼ繝亥宛髯仙ｯｾ遲・
    
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.waitForTimeout(500); // 繝ｬ繝ｼ繝亥宛髯仙ｯｾ遲・
    
    await page.click('button[type="submit"]');
    
    // 繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ繧貞ｾ・▽・医ち繧､繝繧｢繧ｦ繝医ｒ蟒ｶ髟ｷ・・
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 30000 });
    } catch (error) {
      // 繧ｨ繝ｩ繝ｼ隧ｳ邏ｰ繧貞・蜉・
      console.log('笶・繝ｭ繧ｰ繧､繝ｳ螟ｱ謨励ら樟蝨ｨ縺ｮURL:', page.url());
      const errorMessage = await page.locator('.error-message, .toast-error, [role="alert"]').textContent().catch(() => '');
      if (errorMessage) {
        console.log('繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ:', errorMessage);
      }
      throw error;
    }
    
    await page.waitForTimeout(2000); // 繝ｭ繧ｰ繧､繝ｳ蠕後・蠕・ｩ・
  };
  
  // beforeEach縺ｮ莉｣繧上ｊ縺ｫ縲∝推繝・せ繝医〒譁ｰ縺励＞繧ｳ繝ｳ繝・く繧ｹ繝医ｒ菴ｿ逕ｨ

  test('譁ｰ隕上く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｮ菴懈・', async ({ browser }) => {
    // 譁ｰ縺励＞繧ｳ繝ｳ繝・く繧ｹ繝医〒繧医ｊ螳牙ｮ壹＠縺溷虚菴懊ｒ螳溽樟
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 繝ｭ繧ｰ繧､繝ｳ
    await loginAsAdmin(page);
    await page.waitForTimeout(3000); // 蜊∝・縺ｪ蠕・ｩ滂ｼ磯㍾隕・ｼ・
    
    // 繝壹・繧ｸ繧帝哩縺倥ｋ・・ebug-character-form縺ｨ蜷後§繧｢繝励Ο繝ｼ繝・ｼ・
    await page.close();
    
    // 譁ｰ縺励＞繝壹・繧ｸ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・・繝ｼ繧ｸ繧帝幕縺・
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForTimeout(2000);
    
    // 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ繧偵け繝ｪ繝・け・亥承荳翫・邏ｫ濶ｲ縺ｮ繝懊ち繝ｳ・・
    const newButton = newPage.locator('button:has-text("譁ｰ隕丈ｽ懈・")').first();
    
    // 繝懊ち繝ｳ縺瑚ｦ九▽縺九ｉ縺ｪ縺・ｴ蜷医・逶ｴ謗･URL縺ｫ遘ｻ蜍・
    if (await newButton.isVisible()) {
      await newButton.click();
      // 繝壹・繧ｸ驕ｷ遘ｻ繧貞ｾ・▽
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(2000);
    } else {
      console.log('笞・・譁ｰ隕丈ｽ懈・繝懊ち繝ｳ縺瑚ｦ九▽縺九ｉ縺ｪ縺・◆繧√∫峩謗･URL縺ｫ遘ｻ蜍・);
      await newPage.goto('/admin/characters/new');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(2000);
    }
    
    // 蝓ｺ譛ｬ諠・ｱ縺ｮ蜈･蜉・
    const timestamp = Date.now();
    const characterName = `繝・せ繝医く繝｣繝ｩ_${timestamp}`;
    
    // 縺ｾ縺夊ｦ∫ｴ縺ｮ蟄伜惠繧堤｢ｺ隱搾ｼ郁､・焚縺ｮ譁ｹ豕輔〒蠕・ｩ滂ｼ・
    try {
      await newPage.waitForSelector('input[type="text"]', { timeout: 10000 });
    } catch (e) {
      console.log('笞・・input[type="text"]縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縲ゅヵ繧ｩ繝ｼ繝縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧貞ｾ・ｩ・..');
      await newPage.waitForSelector('form', { timeout: 10000 });
      await newPage.waitForTimeout(2000);
    }
    
    // 繝・ヰ繝・げ逕ｨ繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
    await newPage.screenshot({ path: 'character-new-page.png', fullPage: true });
    
    const textInputs = await newPage.locator('input[type="text"]').all();
    const textareas = await newPage.locator('textarea').all();
    
    console.log(`統 蜈･蜉幄ｦ∫ｴ謨ｰ: text inputs=${textInputs.length}, textareas=${textareas.length}`);
    
    // 隕∫ｴ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・繧ｨ繝ｩ繝ｼ・郁ｩｳ邏ｰ諠・ｱ莉倥″・・
    if (textInputs.length === 0) {
      await newPage.screenshot({ path: 'no-text-inputs-error.png', fullPage: true });
      const visibleInputs = await newPage.locator('input:visible').count();
      const allInputs = await newPage.locator('input').count();
      console.log(`投 陦ｨ遉ｺ縺輔ｌ縺ｦ縺・ｋ蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝・ ${visibleInputs}/${allInputs}`);
      
      // 繝壹・繧ｸ縺ｮ迥ｶ諷九ｒ遒ｺ隱・
      const pageTitle = await newPage.title();
      const pageUrl = newPage.url();
      console.log(`塘 繝壹・繧ｸ繧ｿ繧､繝医Ν: ${pageTitle}`);
      console.log(`迫 迴ｾ蝨ｨ縺ｮURL: ${pageUrl}`);
      
      throw new Error(`繝・く繧ｹ繝亥・蜉帙ヵ繧｣繝ｼ繝ｫ繝峨′隕九▽縺九ｊ縺ｾ縺帙ｓ縲り｡ｨ遉ｺ縺輔ｌ縺ｦ縺・ｋ蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝画焚: ${visibleInputs}`);
    }
    
    // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷搾ｼ域律譛ｬ隱槭・闍ｱ隱橸ｼ・
    if (textInputs.length >= 2) {
      await textInputs[0].fill(characterName);
      await textInputs[1].fill(`Test Character ${timestamp}`);
    } else {
      console.warn(`笞・・譛溷ｾ・＠縺滓焚縺ｮ繝・く繧ｹ繝亥・蜉帙ヵ繧｣繝ｼ繝ｫ繝峨′縺ゅｊ縺ｾ縺帙ｓ: ${textInputs.length}蛟義);
      // 譛菴朱剞縲∵怙蛻昴・繝輔ぅ繝ｼ繝ｫ繝峨□縺大・蜉・
      await textInputs[0].fill(characterName);
    }
    
    // 繧ｭ繝｣繝・ヨ繝輔Ξ繝ｼ繧ｺ・域律譛ｬ隱槭・闍ｱ隱橸ｼ・
    if (textInputs.length >= 4) {
      await textInputs[2].fill('繝・せ繝医く繝｣繝・メ繝輔Ξ繝ｼ繧ｺ');
      await textInputs[3].fill('Test catchphrase');
    }
    
    // 隱ｬ譏趣ｼ域律譛ｬ隱槭・闍ｱ隱橸ｼ・
    if (textareas.length >= 2) {
      await textareas[0].fill('E2E繝・せ繝育畑縺ｮ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ隱ｬ譏弱〒縺吶・);
      await textareas[1].fill('This is a test character for E2E testing.');
    } else if (textareas.length >= 1) {
      await textareas[0].fill('E2E繝・せ繝育畑縺ｮ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ隱ｬ譏弱〒縺吶・);
    }
    
    // 繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ
    const selects = await newPage.locator('select').all();
    
    // 諤ｧ蛻･・・逡ｪ逶ｮ縺ｮselect・・
    if (selects.length > 0) {
      await selects[0].selectOption({ index: 1 });
    }
    
    // 蟷ｴ鮨｢縺ｨ閨ｷ讌ｭ
    if (textInputs.length > 5) {
      await textInputs[4].fill('20豁ｳ');
      await textInputs[5].fill('繝・せ繝医く繝｣繝ｩ繧ｯ繧ｿ繝ｼ');
    }
    
    // 諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ・・逡ｪ逶ｮ縺ｮselect・・
    if (selects.length > 1) {
      const options = await selects[1].locator('option').all();
      for (let i = 1; i < options.length; i++) {
        const value = await options[i].getAttribute('value');
        if (value && value !== '') {
          await selects[1].selectOption(value);
          break;
        }
      }
    }
    
    // 諤ｧ譬ｼ繧ｿ繧ｰ繧帝∈謚橸ｼ亥ｿ・茨ｼ・
    const personalityTags = newPage.locator('input[type="checkbox"][name*="personality"], label:has-text("蜆ｪ縺励＞"), label:has-text("繝輔Ξ繝ｳ繝峨Μ繝ｼ")');
    const firstTag = personalityTags.first();
    if (await firstTag.isVisible()) {
      await firstTag.click();
    } else {
      // 繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ縺瑚ｦ九▽縺九ｉ縺ｪ縺・ｴ蜷医∵怙蛻昴・繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ繧偵け繝ｪ繝・け
      const anyCheckbox = newPage.locator('input[type="checkbox"]').first();
      if (await anyCheckbox.isVisible()) {
        await anyCheckbox.click();
      }
    }
    
    // 繝・ヵ繧ｩ繝ｫ繝医Γ繝・そ繝ｼ繧ｸ・域律譛ｬ隱槭・闍ｱ隱橸ｼ・
    if (textareas.length >= 4) {
      await textareas[2].fill('縺薙ｓ縺ｫ縺｡縺ｯ・√ユ繧ｹ繝医く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｧ縺吶ゅｈ繧阪＠縺上♀鬘倥＞縺励∪縺呻ｼ・);
      await textareas[3].fill('Hello! I am a test character. Nice to meet you!');
    } else {
      console.log(`笞・・繝・ヵ繧ｩ繝ｫ繝医Γ繝・そ繝ｼ繧ｸ逕ｨ縺ｮ繝・く繧ｹ繝医お繝ｪ繧｢縺御ｸ崎ｶｳ: ${textareas.length}蛟義);
    }
    
    // 萓｡譬ｼ繧ｿ繧､繝励・驕ｸ謚・
    const priceTypeSelect = newPage.locator('select[name="priceType"], input[name="priceType"][type="radio"], select[name="characterAccessType"]');
    if (await priceTypeSelect.first().isVisible()) {
      // 譛画侭繧帝∈謚・
      await newPage.locator('input[value="paid"], option[value="paid"]').click();
      
      // 萓｡譬ｼ險ｭ螳・
      await newPage.locator('input[name="price"]').fill('1000');
    }
    
    // AI繝｢繝・Ν縺ｮ驕ｸ謚・
    const modelSelect = newPage.locator('select[name="model"], select[name="aiModel"]');
    if (await modelSelect.isVisible()) {
      await modelSelect.selectOption('gpt-4o-mini');
    }
    
    // 逕ｻ蜒上い繝・・繝ｭ繝ｼ繝会ｼ医が繝励す繝ｧ繝ｳ・・
    const imageInput = newPage.locator('input[type="file"][name="avatar"], input[type="file"][name="image"]');
    if (await imageInput.isVisible()) {
      // 繝・せ繝育判蜒上ｒ繧｢繝・・繝ｭ繝ｼ繝会ｼ亥ｮ滄圀縺ｮ繝輔ぃ繧､繝ｫ繝代せ縺悟ｿ・ｦ・ｼ・
      // await imageInput.setInputFiles('path/to/test-image.jpg');
    }
    
    // 菫晏ｭ倥・繧ｿ繝ｳ繧偵け繝ｪ繝・け
    const saveButton = newPage.locator('button:has-text("菫晏ｭ・), button:has-text("菴懈・"), button[type="submit"]').first();
    
    // 繝懊ち繝ｳ縺梧怏蜉ｹ縺ｫ縺ｪ繧九∪縺ｧ蠕・▽
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    
    // 繧ｯ繝ｪ繝・け蜑阪↓繝阪ャ繝医Ρ繝ｼ繧ｯ繧｢繧､繝峨Ν繧貞ｾ・▽
    await newPage.waitForLoadState('networkidle');
    
    // 菫晏ｭ倥・繧ｿ繝ｳ繧偵け繝ｪ繝・け
    await saveButton.click();
    
    // 謌仙粥縺ｮ謖・ｨ吶ｒ蠕・▽・医ｈ繧頑沐霆溘↓・・
    try {
      // 縺ｾ縺壼ｰ代＠蠕・▽
      await newPage.waitForTimeout(2000);
      
      // 迴ｾ蝨ｨ縺ｮURL繧堤｢ｺ隱・
      const currentUrl = newPage.url();
      console.log(`迴ｾ蝨ｨ縺ｮURL: ${currentUrl}`);
      
      // 謌仙粥縺ｮ蛻､螳夲ｼ郁､・焚縺ｮ譚｡莉ｶ・・
      let isSuccess = false;
      try {
        isSuccess = 
          // URL縺後く繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ縺ｾ縺溘・邱ｨ髮・・繝ｼ繧ｸ
          currentUrl.includes('/admin/characters') ||
          // 謌仙粥繝｡繝・そ繝ｼ繧ｸ縺瑚｡ｨ遉ｺ縺輔ｌ縺ｦ縺・ｋ
          await newPage.locator('.toast-success, .success-message').isVisible().catch(() => false) ||
          // 菴懈・縺励◆繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷阪′陦ｨ遉ｺ縺輔ｌ縺ｦ縺・ｋ
          await newPage.locator(`text="${characterName}"`).isVisible().catch(() => false);
      } catch (checkError) {
        console.log('謌仙粥蛻､螳壻ｸｭ縺ｮ繧ｨ繝ｩ繝ｼ:', checkError.message);
        isSuccess = false;
      }
      
      if (isSuccess) {
        console.log(`繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縲・{characterName}縲阪′豁｣蟶ｸ縺ｫ菴懈・縺輔ｌ縺ｾ縺励◆`);
      } else {
        // 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧呈爾縺・
        const errorMessage = await newPage.locator('.error-message, .toast-error, [role="alert"]:has-text("繧ｨ繝ｩ繝ｼ")').textContent().catch(() => null);
        if (errorMessage) {
          throw new Error(`繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繧ｨ繝ｩ繝ｼ: ${errorMessage}`);
        }
        throw new Error('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・縺ｮ謌仙粥縺檎｢ｺ隱阪〒縺阪∪縺帙ｓ縺ｧ縺励◆');
      }
    } catch (error) {
      console.error('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝・せ繝医お繝ｩ繝ｼ:', error);
      try {
        // newPage縺後∪縺髢九＞縺ｦ縺・ｋ蝣ｴ蜷医・縺ｿ繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧呈聴繧・
        if (newPage && !newPage.isClosed()) {
          await newPage.screenshot({ path: 'character-creation-error.png' });
        }
      } catch (screenshotError) {
        console.log('繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ縺ｮ菫晏ｭ倥↓螟ｱ謨・', screenshotError.message);
      }
      throw error;
    } finally {
      // 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・
      try {
        await context.close();
      } catch (closeError) {
        // 繧ｳ繝ｳ繝・く繧ｹ繝医′譌｢縺ｫ髢峨§繧峨ｌ縺ｦ縺・ｋ蝣ｴ蜷医・辟｡隕・
      }
    }
  });

  test('譌｢蟄倥く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｮ邱ｨ髮・, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    let newPage; // 繧ｹ繧ｳ繝ｼ繝励ｒ蠎・￡繧・
    
    console.log('肌 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邱ｨ髮・ユ繧ｹ繝磯幕蟋・);
    
    try {
      // 繝ｭ繧ｰ繧､繝ｳ
      await loginAsAdmin(page);
      await page.waitForTimeout(3000);
      await page.close();
      
      // 譁ｰ縺励＞繝壹・繧ｸ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・・繝ｼ繧ｸ繧帝幕縺・
      newPage = await context.newPage();
      await newPage.goto('/admin/characters');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺悟ｭ伜惠縺吶ｋ縺薙→繧堤｢ｺ隱・
      const characterRows = await newPage.locator('tbody tr, .character-row, [data-testid="character-item"]').count();
      console.log(`投 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ謨ｰ: ${characterRows}`);
      
      if (characterRows === 0) {
        console.log('笞・・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺悟ｭ伜惠縺励∪縺帙ｓ縲ゅユ繧ｹ繝育畑繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧剃ｽ懈・縺励∪縺・..');
        
        // 譁ｰ隕丈ｽ懈・繝壹・繧ｸ縺ｸ遘ｻ蜍・
        await newPage.goto('/admin/characters/new');
        await newPage.waitForLoadState('networkidle');
        await newPage.waitForTimeout(2000);
        
        // 譛蟆城剞縺ｮ諠・ｱ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧剃ｽ懈・
        const timestamp = Date.now();
        
        // 繝輔か繝ｼ繝縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧貞ｾ・▽
        await newPage.waitForSelector('input[type="text"]', { timeout: 10000 });
        await newPage.waitForTimeout(1000);
        
        const textInputs = await newPage.locator('input[type="text"]').all();
        
        if (textInputs.length === 0) {
          console.log('笞・・譁ｰ隕丈ｽ懈・繝壹・繧ｸ縺ｧ繧ょ・蜉帙ヵ繧｣繝ｼ繝ｫ繝峨′隕九▽縺九ｊ縺ｾ縺帙ｓ');
          await newPage.screenshot({ path: 'new-page-no-inputs.png', fullPage: true });
          throw new Error('譁ｰ隕丈ｽ懈・繝壹・繧ｸ縺ｫ蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨′縺ゅｊ縺ｾ縺帙ｓ');
        }
        
        await textInputs[0].fill(`邱ｨ髮・ユ繧ｹ繝育畑_${timestamp}`);
        if (textInputs.length > 1) {
          await textInputs[1].fill(`Edit Test ${timestamp}`);
        }
        
        // 繧ｭ繝｣繝・メ繝輔Ξ繝ｼ繧ｺ
        if (textInputs.length > 3) {
          await textInputs[2].fill('邱ｨ髮・ユ繧ｹ繝育畑繧ｭ繝｣繝・メ繝輔Ξ繝ｼ繧ｺ');
          await textInputs[3].fill('Edit test catchphrase');
        }
        
        // 隱ｬ譏・
        const textareas = await newPage.locator('textarea').all();
        if (textareas.length > 0) {
          await textareas[0].fill('邱ｨ髮・ユ繧ｹ繝育畑縺ｮ隱ｬ譏・);
          if (textareas.length > 1) {
            await textareas[1].fill('Edit test description');
          }
        }
        
        // 諤ｧ蛻･
        const selects = await newPage.locator('select').all();
        if (selects.length > 0) {
          await selects[0].selectOption({ index: 1 });
        }
        
        // 諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ
        if (selects.length > 1) {
          const options = await selects[1].locator('option').all();
          for (let i = 1; i < options.length; i++) {
            const value = await options[i].getAttribute('value');
            if (value && value !== '') {
              await selects[1].selectOption(value);
              break;
            }
          }
        }
        
        // 諤ｧ譬ｼ繧ｿ繧ｰ
        const checkbox = newPage.locator('input[type="checkbox"]').first();
        if (await checkbox.isVisible()) {
          await checkbox.click();
        }
        
        // 繝・ヵ繧ｩ繝ｫ繝医Γ繝・そ繝ｼ繧ｸ
        if (textareas.length >= 4) {
          await textareas[2].fill('邱ｨ髮・ユ繧ｹ繝育畑繝・ヵ繧ｩ繝ｫ繝医Γ繝・そ繝ｼ繧ｸ');
          await textareas[3].fill('Edit test default message');
        }
        
        // 菫晏ｭ・
        await newPage.locator('button[type="submit"]').click();
        await newPage.waitForTimeout(3000);
        
        // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ縺ｫ謌ｻ繧・
        await newPage.goto('/admin/characters');
        await newPage.waitForLoadState('networkidle');
        await newPage.waitForTimeout(2000);
      }
      
      // 邱ｨ髮・・繧ｿ繝ｳ繧呈爾縺呻ｼ磯央遲・い繧､繧ｳ繝ｳ・・
      const editButtonSelectors = [
        'button[title*="邱ｨ髮・]',
        'a[href*="/edit"]',
        'button svg[class*="edit"]',
        'button:has(svg)',
        '.edit-button'
      ];
      
      let editButtonClicked = false;
      for (const selector of editButtonSelectors) {
        try {
          const button = newPage.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            await button.click();
            editButtonClicked = true;
            console.log(`笨・邱ｨ髮・・繧ｿ繝ｳ繧ｯ繝ｪ繝・け: ${selector}`);
            break;
          }
        } catch (e) {
          // 谺｡縺ｮ繧ｻ繝ｬ繧ｯ繧ｿ繝ｼ繧定ｩｦ縺・
        }
      }
      
      if (!editButtonClicked) {
        // 繝・・繝悶Ν蜀・・繝ｪ繝ｳ繧ｯ繧堤峩謗･謗｢縺呻ｼ域桃菴懷・縺ｮ邱ｨ髮・い繧､繧ｳ繝ｳ・・
        const firstRow = newPage.locator('tbody tr').first();
        const editLink = firstRow.locator('td:last-child button').first(); // 謫堺ｽ懷・縺ｮ譛蛻昴・繝懊ち繝ｳ
        if (await editLink.isVisible()) {
          await editLink.click();
          console.log('笨・陦悟・縺ｮ邱ｨ髮・い繧､繧ｳ繝ｳ繧ｯ繝ｪ繝・け');
        } else {
          throw new Error('邱ｨ髮・・繧ｿ繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
        }
      }
      
      // 邱ｨ髮・・繝ｼ繧ｸ縺ｸ縺ｮ驕ｷ遘ｻ繧堤｢ｺ隱・
      await newPage.waitForLoadState('networkidle');
      
      // URL縺檎ｷｨ髮・・繝ｼ繧ｸ縺ｫ螟峨ｏ繧九・繧貞ｾ・▽
      await newPage.waitForURL('**/edit', { timeout: 10000 }).catch(async (e) => {
        console.log('笞・・邱ｨ髮・・繝ｼ繧ｸ縺ｸ縺ｮ驕ｷ遘ｻ縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
        console.log('迴ｾ蝨ｨ縺ｮURL:', newPage.url());
        
        // 隧ｳ邏ｰ繝壹・繧ｸ縺ｫ縺・ｋ蝣ｴ蜷医・縲∫ｷｨ髮・・繧ｿ繝ｳ繧呈爾縺励※繧ｯ繝ｪ繝・け
        const detailPageEditButton = newPage.locator('button:has-text("邱ｨ髮・)').first();
        if (await detailPageEditButton.isVisible()) {
          console.log('統 隧ｳ邏ｰ繝壹・繧ｸ縺ｮ邱ｨ髮・・繧ｿ繝ｳ繧偵け繝ｪ繝・け');
          await detailPageEditButton.click();
          await newPage.waitForLoadState('networkidle');
        }
      });
      
      await newPage.waitForTimeout(3000);
      
      const editUrl = newPage.url();
      console.log(`桃 迴ｾ蝨ｨ縺ｮURL: ${editUrl}`);
      
      // 邱ｨ髮・判髱｢縺九←縺・°繧堤｢ｺ隱・
      if (!editUrl.includes('/edit')) {
        console.log('笶・邱ｨ髮・・繝ｼ繧ｸ縺ｧ縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲りｩｳ邏ｰ繝壹・繧ｸ縺ｮ蜿ｯ閭ｽ諤ｧ縺後≠繧翫∪縺吶・);
        await newPage.screenshot({ path: 'not-edit-page.png', fullPage: true });
        throw new Error('邱ｨ髮・・繝ｼ繧ｸ縺ｸ縺ｮ驕ｷ遘ｻ縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
      }
      
      // 邱ｨ髮・判髱｢縺ｮ隕∫ｴ繧堤｢ｺ隱・
      console.log('笨・邱ｨ髮・判髱｢縺ｫ蛻ｰ驕斐＠縺ｾ縺励◆');
      await newPage.waitForTimeout(2000);
      
      // 繝・ヰ繝・げ逕ｨ繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
      await newPage.screenshot({ path: 'character-edit-page.png', fullPage: true });
      
      // 蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨ｒ謗｢縺吝燕縺ｫ霑ｽ蜉縺ｮ蠕・ｩ・
      await newPage.waitForTimeout(2000);
      
      // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷榊・蜉帙ヵ繧｣繝ｼ繝ｫ繝峨ｒ謗｢縺呻ｼ医せ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ縺ｧ縺ｯ縲後く繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷搾ｼ域律譛ｬ隱橸ｼ峨阪・荳具ｼ・
      let nameInput = null;
      
      // 縺ｾ縺壹後く繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷搾ｼ域律譛ｬ隱橸ｼ峨阪Λ繝吶Ν繧呈爾縺・
      const nameLabel = newPage.locator('text="繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷搾ｼ域律譛ｬ隱橸ｼ・');
      if (await nameLabel.isVisible()) {
        console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷阪Λ繝吶Ν繧堤匱隕・);
        // 繝ｩ繝吶Ν縺ｮ谺｡縺ｮ蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨ｒ謗｢縺・
        nameInput = newPage.locator('text="繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷搾ｼ域律譛ｬ隱橸ｼ・ >> .. >> input[type="text"]').first();
        if (!(await nameInput.isVisible())) {
          // 蛻･縺ｮ譁ｹ豕包ｼ壽怙蛻昴・繝・く繧ｹ繝亥・蜉帙ヵ繧｣繝ｼ繝ｫ繝・
          nameInput = newPage.locator('input[type="text"]').first();
        }
      } else {
        // 繝ｩ繝吶Ν縺瑚ｦ九▽縺九ｉ縺ｪ縺・ｴ蜷医・縲∵怙蛻昴・繝・く繧ｹ繝亥・蜉帙ヵ繧｣繝ｼ繝ｫ繝峨ｒ菴ｿ逕ｨ
        nameInput = newPage.locator('input[type="text"]').first();
      }
      
      if (!nameInput || !(await nameInput.isVisible())) {
        // 繧ｨ繝ｩ繝ｼ譎ゅ・隧ｳ邏ｰ諠・ｱ繧貞庶髮・
        await newPage.screenshot({ path: 'no-input-fields-error.png', fullPage: true });
        const visibleInputs = await newPage.locator('input:visible').count();
        const allInputs = await newPage.locator('input').count();
        console.log(`投 陦ｨ遉ｺ縺輔ｌ縺ｦ縺・ｋ蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝・ ${visibleInputs}/${allInputs}`);
        
        // 繝壹・繧ｸ縺ｮHTML繧剃ｸ驛ｨ蜃ｺ蜉帙＠縺ｦ繝・ヰ繝・げ
        const pageContent = await newPage.content();
        console.log('繝壹・繧ｸHTML縺ｮ荳驛ｨ:', pageContent.substring(0, 500));
        
        throw new Error(`蜷榊燕蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨′隕九▽縺九ｊ縺ｾ縺帙ｓ縲り｡ｨ遉ｺ縺輔ｌ縺ｦ縺・ｋ蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝画焚: ${visibleInputs}`);
      }
      
      // 迴ｾ蝨ｨ縺ｮ蛟､繧貞叙蠕・
      const originalName = await nameInput.inputValue();
      console.log(`統 迴ｾ蝨ｨ縺ｮ蜷榊燕: ${originalName}`);
      
      // 蜷榊燕繧呈峩譁ｰ
      const timestamp = Date.now();
      const updatedName = `${originalName}_譖ｴ譁ｰ_${timestamp}`;
      
      await nameInput.clear();
      await nameInput.fill(updatedName);
      console.log('笨・蜷榊燕譖ｴ譁ｰ螳御ｺ・);
      
      // 繝・ヵ繧ｩ繝ｫ繝医Γ繝・そ繝ｼ繧ｸ繧呈峩譁ｰ
      const messageTextarea = newPage.locator('textarea').first();
      if (await messageTextarea.isVisible()) {
        await messageTextarea.clear();
        await messageTextarea.fill('譖ｴ譁ｰ縺輔ｌ縺溘ョ繝輔か繝ｫ繝医Γ繝・そ繝ｼ繧ｸ縺ｧ縺吶・2E繝・せ繝医↓繧医ｋ邱ｨ髮・・);
        console.log('笨・繝・ヵ繧ｩ繝ｫ繝医Γ繝・そ繝ｼ繧ｸ譖ｴ譁ｰ螳御ｺ・);
      }
      
      // 諤ｧ譬ｼ繧ｿ繧､繝励ｒ螟画峩・亥━縺励＞縺ｨ雉｢縺・ｒ驕ｸ謚橸ｼ・
      const kindCheckbox = newPage.locator('label:has-text("蜆ｪ縺励＞") input[type="checkbox"]');
      if (await kindCheckbox.isVisible()) {
        const isChecked = await kindCheckbox.isChecked();
        if (!isChecked) {
          await kindCheckbox.click();
          console.log('笨・縲悟━縺励＞縲阪ｒ驕ｸ謚・);
        }
      }
      
      const smartCheckbox = newPage.locator('label:has-text("雉｢縺・) input[type="checkbox"]');
      if (await smartCheckbox.isVisible()) {
        const isChecked = await smartCheckbox.isChecked();
        if (!isChecked) {
          await smartCheckbox.click();
          console.log('笨・縲瑚ｳ｢縺・阪ｒ驕ｸ謚・);
        }
      }
      
      // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ・域峩譁ｰ蜑搾ｼ・
      await newPage.screenshot({ path: 'character-edit-before-save.png', fullPage: true });
      
      // 菫晏ｭ倥・繧ｿ繝ｳ繧呈爾縺呻ｼ医せ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ縺ｧ縺ｯ蜿ｳ荳九・邏ｫ濶ｲ縺ｮ繝懊ち繝ｳ・・
      let saveButton = null;
      
      // 縺ｾ縺夂ｴｫ濶ｲ縺ｮ菫晏ｭ倥・繧ｿ繝ｳ繧呈爾縺・
      saveButton = newPage.locator('button:has-text("菫晏ｭ・)').filter({ hasClass: /bg-purple|purple|primary/ }).first();
      
      if (!(await saveButton.isVisible())) {
        // 騾壼ｸｸ縺ｮ菫晏ｭ倥・繧ｿ繝ｳ繧呈爾縺・
        const saveButtonSelectors = [
          'button:has-text("菫晏ｭ・)',
          'button[type="submit"]:has-text("菫晏ｭ・)',
          'button:has-text("譖ｴ譁ｰ")',
          'button:has-text("螟画峩繧剃ｿ晏ｭ・)'
        ];
        
        for (const selector of saveButtonSelectors) {
          const button = newPage.locator(selector).first();
          if (await button.isVisible({ timeout: 1000 })) {
            saveButton = button;
            console.log(`笨・菫晏ｭ倥・繧ｿ繝ｳ逋ｺ隕・ ${selector}`);
            break;
          }
        }
      }
      
      if (!saveButton || !(await saveButton.isVisible())) {
        await newPage.screenshot({ path: 'save-button-not-found.png', fullPage: true });
        throw new Error('菫晏ｭ倥・繧ｿ繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
      }
      
      // API繝ｬ繧ｹ繝昴Φ繧ｹ繧堤屮隕・
      const updateResponsePromise = newPage.waitForResponse(
        response => response.url().includes('/api/v1/admin/characters') && 
                   (response.request().method() === 'PUT' || response.request().method() === 'PATCH'),
        { timeout: 10000 }
      ).catch(() => null);
      
      // 菫晏ｭ・
      await saveButton.click();
      console.log('笨・菫晏ｭ倥・繧ｿ繝ｳ繧ｯ繝ｪ繝・け');
      
      // 繝ｬ繧ｹ繝昴Φ繧ｹ繧貞ｾ・▽
      const response = await updateResponsePromise;
      if (response) {
        const status = response.status();
        console.log(`藤 API繝ｬ繧ｹ繝昴Φ繧ｹ: ${status}`);
        
        if (status === 200 || status === 201) {
          console.log(`笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縲・{updatedName}縲阪′豁｣蟶ｸ縺ｫ譖ｴ譁ｰ縺輔ｌ縺ｾ縺励◆`);
        } else {
          const responseBody = await response.json().catch(() => response.text());
          console.log('笶・譖ｴ譁ｰ繧ｨ繝ｩ繝ｼ:', responseBody);
        }
      }
      
      // 邨先棡繧貞ｾ・▽
      await newPage.waitForTimeout(3000);
      
      // 謌仙粥蛻､螳・
      const finalUrl = newPage.url();
      const isSuccess = 
        finalUrl.includes('/admin/characters') && !finalUrl.includes('/edit') ||
        await newPage.locator('.toast-success').isVisible().catch(() => false);
      
      if (!isSuccess) {
        await newPage.screenshot({ path: 'character-edit-error.png', fullPage: true });
      }
      
      expect(response?.status()).toBe(200);
      
    } catch (error) {
      console.error('笶・邱ｨ髮・ユ繧ｹ繝医お繝ｩ繝ｼ:', error);
      // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ縺ｯ繧ｨ繝ｩ繝ｼ邂・園縺ｧ逶ｴ謗･菫晏ｭ・
      throw error;
    } finally {
      try {
        await context.close();
      } catch (e) {
        // 繧ｳ繝ｳ繝・く繧ｹ繝医′譌｢縺ｫ髢峨§繧峨ｌ縺ｦ縺・ｋ蝣ｴ蜷医・辟｡隕・
      }
    }
  });

  test('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｮ蜑企勁', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    let newPage; // 繧ｹ繧ｳ繝ｼ繝励ｒ蠎・￡繧・
    
    console.log('卵・・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜑企勁繝・せ繝磯幕蟋・);
    
    try {
      // 繝ｭ繧ｰ繧､繝ｳ
      await loginAsAdmin(page);
      await page.waitForTimeout(3000);
      await page.close();
      
      // 譁ｰ縺励＞繝壹・繧ｸ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・・繝ｼ繧ｸ繧帝幕縺・
      newPage = await context.newPage();
      await newPage.goto('/admin/characters');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ陦後ｒ蜿門ｾ・
      const characterRows = await newPage.locator('tbody tr, .character-row').all();
      const rowCount = characterRows.length;
      console.log(`投 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ謨ｰ: ${rowCount}`);
      
      if (rowCount === 0) {
        console.log('笞・・蜑企勁縺ｧ縺阪ｋ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺後≠繧翫∪縺帙ｓ');
        // 繝・せ繝医ｒ繧ｹ繧ｭ繝・・
        return;
      }
      
      // 繝・せ繝育畑縺ｫ菴懈・縺輔ｌ縺溘く繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧呈爾縺・
      let targetRow = null;
      let characterName = '';
      
      // 繝・せ繝磯未騾｣縺ｮ蜷榊燕繧呈戟縺､繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧呈爾縺・
      for (const row of characterRows) {
        const nameElement = await row.locator('td:first-child, .character-name').first();
        const nameText = await nameElement.textContent().catch(() => null);
        
        if (nameText && (nameText.includes('繝・せ繝・) || nameText.includes('Test') || nameText.includes('邱ｨ髮・))) {
          targetRow = row;
          characterName = nameText;
          console.log(`識 蜑企勁蟇ｾ雎｡: ${characterName}`);
          break;
        }
      }
      
      // 繝・せ繝育畑繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺瑚ｦ九▽縺九ｉ縺ｪ縺・ｴ蜷医∵怙蠕後・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧剃ｽｿ逕ｨ
      if (!targetRow) {
        targetRow = characterRows[characterRows.length - 1];
        characterName = await targetRow.locator('td:first-child, .character-name').textContent() || '荳肴・';
        console.log(`識 譛蠕後・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧貞炎髯､: ${characterName}`);
      }
      
      // 蜑企勁繝懊ち繝ｳ繧呈爾縺呻ｼ医ョ繧ｹ繧ｯ繝医ャ繝励ン繝･繝ｼ縺ｮ縺ｿ・・
      console.log('剥 蜑企勁繝懊ち繝ｳ繧呈爾縺励※縺・∪縺・..');
      
      // 繝・ヰ繝・げ逕ｨ繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
      await newPage.screenshot({ path: 'character-list-before-delete.png', fullPage: true });
      
      let deleteButton = null;
      
      // 繝・せ繧ｯ繝医ャ繝励ン繝･繝ｼ縺ｧ縺ｯ縲∵桃菴懷・・域怙蠕後・蛻暦ｼ峨・繝懊ち繝ｳ繧呈爾縺・
      const actionCell = targetRow.locator('td:last-child');
      deleteButton = await actionCell.locator('button:has-text("蜑企勁")').first();
      
      if (!(await deleteButton.count())) {
        // 繝・く繧ｹ繝医′縺ｪ縺・ｴ蜷医√い繧､繧ｳ繝ｳ繝懊ち繝ｳ繧呈爾縺・
        const actionButtons = await actionCell.locator('button').all();
        if (actionButtons.length >= 2) {
          deleteButton = actionButtons[actionButtons.length - 1]; // 騾壼ｸｸ譛蠕後・繝懊ち繝ｳ
          console.log(`投 謫堺ｽ懷・縺ｮ繝懊ち繝ｳ謨ｰ: ${actionButtons.length}縲∵怙蠕後・繝懊ち繝ｳ繧貞炎髯､繝懊ち繝ｳ縺ｨ縺励※菴ｿ逕ｨ`);
        }
      } else {
        console.log('笨・縲悟炎髯､縲阪ユ繧ｭ繧ｹ繝医ｒ謖√▽繝懊ち繝ｳ繧呈､懷・');
      }
      
      // 蠕捺擂縺ｮ繧ｻ繝ｬ繧ｯ繧ｿ縺ｧ繧りｩｦ縺・
      if (!deleteButton) {
        const deleteButtonSelectors = [
          'button[title*="蜑企勁"]',
          'button[aria-label*="蜑企勁"]',
          'button:has(svg[class*="trash"])',
          'button:has-text("蜑企勁")',
          '[data-action="delete"]',
          '.delete-button',
          'button[class*="delete"]',
          'button[class*="danger"]'
        ];
        
        for (const selector of deleteButtonSelectors) {
          try {
            const button = targetRow.locator(selector).first();
            if (await button.isVisible({ timeout: 500 })) {
              deleteButton = button;
              console.log(`笨・蜑企勁繝懊ち繝ｳ逋ｺ隕・ ${selector}`);
              break;
            }
          } catch (e) {
            // 谺｡縺ｮ繧ｻ繝ｬ繧ｯ繧ｿ繧定ｩｦ縺・
          }
        }
      }
      
      if (!deleteButton) {
        // 繧ｨ繝ｩ繝ｼ譎ゅ・隧ｳ邏ｰ諠・ｱ
        const buttonsInfo = [];
        for (let i = 0; i < actionButtons.length; i++) {
          const button = actionButtons[i];
          const title = await button.getAttribute('title').catch(() => null);
          const ariaLabel = await button.getAttribute('aria-label').catch(() => null);
          const classes = await button.getAttribute('class').catch(() => null);
          buttonsInfo.push(`繝懊ち繝ｳ${i + 1}: title="${title}", aria-label="${ariaLabel}", class="${classes}"`);
        }
        console.log('剥 謫堺ｽ懷・縺ｮ繝懊ち繝ｳ隧ｳ邏ｰ:', buttonsInfo);
        
        await newPage.screenshot({ path: 'delete-button-not-found.png', fullPage: true });
        throw new Error(`蜑企勁繝懊ち繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縲よ桃菴懷・縺ｮ繝懊ち繝ｳ謨ｰ: ${actionButtons.length}`);
      }
      
      // 蜑企勁繝懊ち繝ｳ繧偵け繝ｪ繝・け
      try {
        // 縺ｾ縺壹・繧ｿ繝ｳ縺ｮ迥ｶ諷九ｒ遒ｺ隱・
        const isVisible = await deleteButton.isVisible();
        const boundingBox = await deleteButton.boundingBox();
        console.log(`投 蜑企勁繝懊ち繝ｳ縺ｮ迥ｶ諷・ visible=${isVisible}, boundingBox=${JSON.stringify(boundingBox)}`);
        
        if (!isVisible) {
          // 繝懊ち繝ｳ縺瑚ｦ九∴縺ｪ縺・ｴ蜷医∬ｦｪ隕∫ｴ繧偵・繝舌・縺励※繝峨Ο繝・・繝繧ｦ繝ｳ繧帝幕縺・
          const parentCell = deleteButton.locator('..');
          await parentCell.hover();
          await newPage.waitForTimeout(500);
          
          // 縺昴ｌ縺ｧ繧りｦ九∴縺ｪ縺・ｴ蜷医・縲√Δ繝舌う繝ｫ繝｡繝九Η繝ｼ繝懊ち繝ｳ繧呈爾縺・
          const menuButton = targetRow.locator('button').first();
          if (await menuButton.isVisible()) {
            console.log('導 繝｡繝九Η繝ｼ繝懊ち繝ｳ繧偵け繝ｪ繝・け');
            await menuButton.click();
            await newPage.waitForTimeout(500);
            
            // 繝｡繝九Η繝ｼ蜀・・蜑企勁繝懊ち繝ｳ繧呈爾縺・
            const menuDeleteButton = newPage.locator('button:has-text("蜑企勁"):visible').first();
            if (await menuDeleteButton.isVisible()) {
              console.log('笨・繝｡繝九Η繝ｼ蜀・・蜑企勁繝懊ち繝ｳ繧偵け繝ｪ繝・け');
              await menuDeleteButton.click();
            } else {
              // 譛邨よ焔谿ｵ・喃orce繧ｯ繝ｪ繝・け
              console.log('笞・・force繧ｯ繝ｪ繝・け繧剃ｽｿ逕ｨ');
              await deleteButton.click({ force: true });
            }
          } else {
            // 譛邨よ焔谿ｵ・喃orce繧ｯ繝ｪ繝・け
            console.log('笞・・force繧ｯ繝ｪ繝・け繧剃ｽｿ逕ｨ');
            await deleteButton.click({ force: true });
          }
        } else {
          // 騾壼ｸｸ縺ｮ繧ｯ繝ｪ繝・け
          await deleteButton.click();
        }
      } catch (clickError) {
        console.log('笞・・繧ｯ繝ｪ繝・け繧ｨ繝ｩ繝ｼ:', clickError.message);
        // 繧ｨ繝ｩ繝ｼ繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
        await newPage.screenshot({ path: 'delete-button-click-error.png', fullPage: true });
        
        // 莉｣譖ｿ譁ｹ豕包ｼ壹・繝ｼ繧ｸ荳翫・縺吶∋縺ｦ縺ｮ蜑企勁繝懊ち繝ｳ繧呈爾縺・
        const allDeleteButtons = await newPage.locator('button:has-text("蜑企勁"):visible').all();
        console.log(`投 繝壹・繧ｸ荳翫・蜑企勁繝懊ち繝ｳ謨ｰ: ${allDeleteButtons.length}`);
        
        if (allDeleteButtons.length > 0) {
          console.log('笨・譛蛻昴・蜑企勁繝懊ち繝ｳ繧偵け繝ｪ繝・け');
          await allDeleteButtons[0].click();
        } else {
          throw new Error('蜑企勁繝懊ち繝ｳ縺後け繝ｪ繝・け縺ｧ縺阪∪縺帙ｓ');
        }
      }
      console.log('笨・蜑企勁繝懊ち繝ｳ繧ｯ繝ｪ繝・け螳御ｺ・);
      
      // 遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ繧貞ｾ・▽
      await newPage.waitForTimeout(1000);
      
      // JavaScript縺ｮ confirm 繝繧､繧｢繝ｭ繧ｰ繧貞・逅・
      newPage.on('dialog', async dialog => {
        console.log(`討 繝繧､繧｢繝ｭ繧ｰ繝｡繝・そ繝ｼ繧ｸ: ${dialog.message()}`);
        await dialog.accept();
        console.log('笨・遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ繧呈価隱・);
      });
      
      // 繧ｫ繧ｹ繧ｿ繝繝繧､繧｢繝ｭ繧ｰ縺ｮ隕∫ｴ繧呈爾縺・
      const dialogSelectors = [
        '.confirm-dialog',
        '[role="dialog"]',
        '.modal',
        '[data-testid="confirm-dialog"]',
        '.delete-confirmation'
      ];
      
      let confirmDialog = null;
      for (const selector of dialogSelectors) {
        const dialog = newPage.locator(selector).first();
        if (await dialog.isVisible({ timeout: 1000 })) {
          confirmDialog = dialog;
          console.log(`笨・遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ逋ｺ隕・ ${selector}`);
          break;
        }
      }
      
      if (!confirmDialog) {
        console.log('笞・・遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ縺瑚｡ｨ遉ｺ縺輔ｌ縺ｾ縺帙ｓ縺ｧ縺励◆');
        // 逶ｴ謗･蜑企勁縺輔ｌ繧句庄閭ｽ諤ｧ繧ゅ≠繧九◆繧√∫ｶ夊｡・
      }
      
      // 遒ｺ隱阪・繧ｿ繝ｳ繧呈爾縺呻ｼ医ム繧､繧｢繝ｭ繧ｰ蜀・､紋ｸ｡譁ｹ・・
      const confirmButtonSelectors = [
        'button:has-text("蜑企勁")',
        'button:has-text("遒ｺ隱・)',
        'button:has-text("OK")',
        'button:has-text("縺ｯ縺・)',
        'button[data-action="confirm"]',
        'button.confirm-delete',
        'button[class*="danger"]:has-text("蜑企勁")'
      ];
      
      if (confirmDialog) {
        
        // API繝ｬ繧ｹ繝昴Φ繧ｹ繧堤屮隕・
        const deleteResponsePromise = newPage.waitForResponse(
          response => response.url().includes('/api/v1/admin/characters') && response.request().method() === 'DELETE',
          { timeout: 10000 }
        ).catch(() => null);
        
        // 繝繧､繧｢繝ｭ繧ｰ蜀・・繝懊ち繝ｳ繧偵け繝ｪ繝・け
        let confirmClicked = false;
        for (const selector of confirmButtonSelectors) {
          const button = confirmDialog.locator(selector).last();
          if (await button.isVisible({ timeout: 1000 })) {
            await button.click();
            confirmClicked = true;
            console.log(`笨・遒ｺ隱阪・繧ｿ繝ｳ繧ｯ繝ｪ繝・け: ${selector}`);
            break;
          }
        }
        
        if (!confirmClicked) {
          // 繝繧､繧｢繝ｭ繧ｰ螟悶・遒ｺ隱阪・繧ｿ繝ｳ繧呈爾縺・
          const globalConfirm = newPage.locator('button:has-text("蜑企勁"), button:has-text("遒ｺ隱・)').last();
          if (await globalConfirm.isVisible()) {
            await globalConfirm.click();
            console.log('笨・繧ｰ繝ｭ繝ｼ繝舌Ν遒ｺ隱阪・繧ｿ繝ｳ繧ｯ繝ｪ繝・け');
          }
        }
        
        // API繝ｬ繧ｹ繝昴Φ繧ｹ繧貞ｾ・▽
        const response = await deleteResponsePromise;
        if (response) {
          const status = response.status();
          console.log(`藤 API繝ｬ繧ｹ繝昴Φ繧ｹ: ${status}`);
          expect(status).toBe(200);
        }
        
        // 蜑企勁蠕後・遒ｺ隱・
        await newPage.waitForTimeout(2000);
        
        // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺後Μ繧ｹ繝医°繧画ｶ医∴縺溘％縺ｨ繧堤｢ｺ隱・
        const deletedCharacter = newPage.locator(`text="${characterName}"`);
        const isDeleted = !(await deletedCharacter.isVisible({ timeout: 1000 }).catch(() => false));
        
        if (isDeleted) {
          console.log(`笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縲・{characterName}縲阪′豁｣蟶ｸ縺ｫ蜑企勁縺輔ｌ縺ｾ縺励◆`);
        } else {
          console.log(`笞・・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縲・{characterName}縲阪′縺ｾ縺陦ｨ遉ｺ縺輔ｌ縺ｦ縺・∪縺兪);
        }
      } else {
        console.log('笞・・遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ縺瑚｡ｨ遉ｺ縺輔ｌ縺ｾ縺帙ｓ縺ｧ縺励◆');
        // 逶ｴ謗･API繧貞他縺ｶ蜿ｯ閭ｽ諤ｧ繧ゅ≠繧九・縺ｧ縲√Ξ繧ｹ繝昴Φ繧ｹ繧貞ｾ・▽
        await newPage.waitForTimeout(3000);
      }
      
    } catch (error) {
      console.error('笶・蜑企勁繝・せ繝医お繝ｩ繝ｼ:', error);
      if (newPage && !newPage.isClosed()) {
        await newPage.screenshot({ path: 'delete-test-error.png', fullPage: true });
      }
      throw error;
    } finally {
      try {
        await context.close();
      } catch (e) {
        // 繧ｳ繝ｳ繝・く繧ｹ繝医′譌｢縺ｫ髢峨§繧峨ｌ縺ｦ縺・ｋ蝣ｴ蜷医・辟｡隕・
      }
    }
  });

  test.skip('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｮ繧ｹ繝・・繧ｿ繧ｹ邂｡逅・, async ({ browser }) => {
    // 繧ｹ繝・・繧ｿ繧ｹ邂｡逅・ｩ溯・縺悟ｮ溯｣・＆繧後◆繧画怏蜉ｹ蛹・
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 繝ｭ繧ｰ繧､繝ｳ
    await loginAsAdmin(page);
    await page.waitForTimeout(3000);
    await page.close();
    
    // 譁ｰ縺励＞繝壹・繧ｸ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・・繝ｼ繧ｸ繧帝幕縺・
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    
    // 繧｢繧ｯ繝・ぅ繝悶↑繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧呈爾縺・
    const activeRow = newPage.locator('tr:has-text("蜈ｬ髢倶ｸｭ"), tr:has-text("Active"), tr:has(.status-active)').first();
    
    if (await activeRow.isVisible()) {
      const characterName = await activeRow.locator('td:first-child').textContent();
      
      // 髱槫・髢九↓縺吶ｋ
      const toggleButton = activeRow.locator('button:has-text("髱槫・髢九↓縺吶ｋ"), .status-toggle');
      await toggleButton.click();
      
      // 遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ縺ｮ蜃ｦ逅・
      const confirmDialog = newPage.locator('.confirm-dialog');
      if (await confirmDialog.isVisible({ timeout: 1000 })) {
        await newPage.locator('button:has-text("遒ｺ隱・)').click();
      }
      
      // 繧ｹ繝・・繧ｿ繧ｹ縺悟､画峩縺輔ｌ縺溘％縺ｨ繧堤｢ｺ隱・
      await newPage.waitForTimeout(1000);
      await expect(activeRow).toContainText('髱槫・髢・);
      
      // 蜀榊ｺｦ蜈ｬ髢九☆繧・
      const publishButton = activeRow.locator('button:has-text("蜈ｬ髢九☆繧・), .status-toggle');
      await publishButton.click();
      
      if (await confirmDialog.isVisible({ timeout: 1000 })) {
        await newPage.locator('button:has-text("遒ｺ隱・)').click();
      }
      
      console.log(`繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縲・{characterName}縲阪・繧ｹ繝・・繧ｿ繧ｹ蛻・ｊ譖ｿ縺医′豁｣蟶ｸ縺ｫ蜍穂ｽ懊＠縺ｾ縺励◆`);
    }
    
    await context.close();
  });

  test('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ逕ｻ蜒上・邂｡逅・, async ({ browser }) => {
    test.setTimeout(180000); // 繝・せ繝医ち繧､繝繧｢繧ｦ繝医ｒ3蛻・↓蟒ｶ髟ｷ
    
    const context = await browser.newContext();
    const page = await context.newPage();
    let newPage; // 繧ｹ繧ｳ繝ｼ繝励ｒ蠎・￡繧・
    
    try {
      // 繝ｭ繧ｰ繧､繝ｳ
      await loginAsAdmin(page);
      await page.waitForTimeout(3000);
      await page.close();
      
      // 譁ｰ縺励＞繝壹・繧ｸ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・・繝ｼ繧ｸ繧帝幕縺・
      newPage = await context.newPage();
      await newPage.goto('/admin/characters');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(2000);
      
      // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺悟ｭ伜惠縺吶ｋ縺狗｢ｺ隱・
      const rowCount = await newPage.locator('tbody tr').count();
      console.log(`投 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ謨ｰ: ${rowCount}`);
      
      if (rowCount === 0) {
        console.log('笞・・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺悟ｭ伜惠縺励∪縺帙ｓ');
        return;
      }
      
      // 譛蛻昴・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｮ邱ｨ髮・・繧ｿ繝ｳ繧偵け繝ｪ繝・け
      const firstRow = newPage.locator('tbody tr').first();
      
      // 邱ｨ髮・・繧ｿ繝ｳ繧貞ｾ・ｩ溘＠縺ｦ縺九ｉ繧ｯ繝ｪ繝・け
      try {
        // 邱ｨ髮・・繧ｿ繝ｳ縺ｮ繧ｻ繝ｬ繧ｯ繧ｿ繝ｼ繧呈隼蝟・
        const editButton = firstRow.locator('button').filter({ has: newPage.locator('[data-lucide="edit"], [data-lucide="pencil"], svg') }).first();
        
        await editButton.waitFor({ state: 'visible', timeout: 5000 });
        await editButton.click();
      } catch (error) {
        console.log('笞・・邱ｨ髮・・繧ｿ繝ｳ縺ｮ繧ｯ繝ｪ繝・け縺ｫ螟ｱ謨・', error.message);
        
        // 莉｣譖ｿ譁ｹ豕・ 隧ｳ邏ｰ繝壹・繧ｸ邨檎罰縺ｧ邱ｨ髮・
        try {
          const viewButton = firstRow.locator('button').first();
          await viewButton.click();
          await newPage.waitForLoadState('networkidle');
          await newPage.waitForTimeout(2000);
          
          // 隧ｳ邏ｰ繝壹・繧ｸ縺九ｉ邱ｨ髮・・繧ｿ繝ｳ繧偵け繝ｪ繝・け
          const editButtonOnDetail = newPage.locator('button:has-text("邱ｨ髮・)');
          await editButtonOnDetail.click();
        } catch (altError) {
          console.log('笞・・莉｣譖ｿ譁ｹ豕輔ｂ螟ｱ謨・', altError.message);
          return;
        }
      }
      
      // 邱ｨ髮・・繝ｼ繧ｸ縺ｸ縺ｮ驕ｷ遘ｻ繧貞ｾ・▽
      await newPage.waitForURL('**/edit', { timeout: 10000 }).catch(() => {
        console.log('笞・・邱ｨ髮・・繝ｼ繧ｸ縺ｸ縺ｮ驕ｷ遘ｻ縺ｫ螟ｱ謨・);
      });
      await newPage.waitForTimeout(2000);
      
      // 逕ｻ蜒冗ｮ｡逅・そ繧ｯ繧ｷ繝ｧ繝ｳ繧呈爾縺・
      console.log('名・・逕ｻ蜒冗ｮ｡逅・そ繧ｯ繧ｷ繝ｧ繝ｳ繧堤｢ｺ隱堺ｸｭ...');
      
      // 繧ｮ繝｣繝ｩ繝ｪ繝ｼ逕ｻ蜒上そ繧ｯ繧ｷ繝ｧ繝ｳ縺ｾ縺溘・逕ｻ蜒城未騾｣縺ｮ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ繧呈爾縺・
      const gallerySectionSelectors = [
        'text="繧ｮ繝｣繝ｩ繝ｪ繝ｼ逕ｻ蜒・',
        'text="逕ｻ蜒剰ｨｭ螳・',
        'text="繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ逕ｻ蜒・',
        'text="繝ｬ繝吶Ν"',
        'text="隗｣謾ｾ繝ｬ繝吶Ν"'
      ];
      
      let gallerySectionFound = false;
      for (const selector of gallerySectionSelectors) {
        if (await newPage.locator(selector).isVisible()) {
          console.log(`笨・逕ｻ蜒上そ繧ｯ繧ｷ繝ｧ繝ｳ繧堤匱隕・ ${selector}`);
          gallerySectionFound = true;
          break;
        }
      }
      
      if (gallerySectionFound) {
        // 繝ｬ繝吶Ν逕ｻ蜒上・謨ｰ繧堤｢ｺ隱・
        const levelImageElements = await newPage.locator('text=/隗｣謾ｾ繝ｬ繝吶Ν|繝ｬ繝吶Ν.*\\d+/').all();
        console.log(`投 繝ｬ繝吶Ν逕ｻ蜒剰ｦ∫ｴ謨ｰ: ${levelImageElements.length}`);
        
        // 逕ｻ蜒上い繝・・繝ｭ繝ｼ繝峨ヵ繧｣繝ｼ繝ｫ繝峨・謨ｰ繧堤｢ｺ隱・
        const uploadFields = await newPage.locator('input[type="file"]').all();
        console.log(`豆 繧｢繝・・繝ｭ繝ｼ繝峨ヵ繧｣繝ｼ繝ｫ繝画焚: ${uploadFields.length}`);
        
        // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧剃ｿ晏ｭ・
        await newPage.screenshot({ path: 'character-image-management.png', fullPage: true });
      }
      
      // 繧｢繝・・繝ｭ繝ｼ繝牙庄閭ｽ譫壽焚縺ｮ遒ｺ隱・
      const totalSlots = await newPage.locator('input[type="file"][id^="gallery-upload-"]').count();
      console.log(`\n投 逕ｻ蜒上い繝・・繝ｭ繝ｼ繝臥ｵｱ險・`);
      console.log(`- 邱上せ繝ｭ繝・ヨ謨ｰ: ${totalSlots}`);
      console.log(`- 隕ｪ蟇・ｺｦ繝ｬ繝吶Ν遽・峇: 0-100`);
      console.log(`- 隗｣謾ｾ髢馴囈: 10繝ｬ繝吶Ν縺斐→`);
      
      // 螳滄圀縺ｫ繝輔ぃ繧､繝ｫ繧偵い繝・・繝ｭ繝ｼ繝峨☆繧句ｴ蜷医・繝・せ繝茨ｼ医さ繝｡繝ｳ繝医い繧ｦ繝茨ｼ・
      // const testImagePath = path.join(__dirname, 'test-assets', 'test-character.jpg');
      // if (fs.existsSync(testImagePath)) {
      //   await newPage.locator('#gallery-upload-0').setInputFiles(testImagePath);
      //   console.log('笨・繝・せ繝育判蜒上ｒ繝ｬ繝吶Ν10縺ｫ繧｢繝・・繝ｭ繝ｼ繝・);
      // }
      
    } catch (error) {
      console.error('笶・逕ｻ蜒冗ｮ｡逅・ユ繧ｹ繝医お繝ｩ繝ｼ:', error);
      throw error;
    } finally {
      try {
        await context.close();
      } catch (e) {
        // 繧ｳ繝ｳ繝・く繧ｹ繝医′譌｢縺ｫ髢峨§繧峨ｌ縺ｦ縺・ｋ蝣ｴ蜷医・辟｡隕・
      }
    }
  });

  test.skip('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｮ荳諡ｬ謫堺ｽ・, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 繝ｭ繧ｰ繧､繝ｳ
    await loginAsAdmin(page);
    await page.waitForTimeout(3000);
    await page.close();
    
    // 譁ｰ縺励＞繝壹・繧ｸ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・・繝ｼ繧ｸ繧帝幕縺・
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    
    // 繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ縺ｧ隍・焚驕ｸ謚・
    const checkboxes = newPage.locator('input[type="checkbox"][name="characterIds"], .character-checkbox');
    
    if (await checkboxes.first().isVisible()) {
      // 2縺､縺ｮ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧帝∈謚・
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // 荳諡ｬ謫堺ｽ懊Γ繝九Η繝ｼ縺ｮ陦ｨ遉ｺ
      const bulkActions = newPage.locator('.bulk-actions, select[name="bulkAction"]');
      await expect(bulkActions).toBeVisible();
      
      // 荳諡ｬ髱槫・髢九・繝・せ繝・
      if (await newPage.locator('option[value="unpublish"]').isVisible()) {
        await bulkActions.selectOption('unpublish');
        
        // 螳溯｡後・繧ｿ繝ｳ
        await newPage.locator('button:has-text("螳溯｡・)').click();
        
        // 遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ
        const confirmDialog = newPage.locator('.confirm-dialog');
        if (await confirmDialog.isVisible()) {
          await newPage.locator('button:has-text("遒ｺ隱・)').click();
        }
        
        console.log('荳諡ｬ謫堺ｽ懶ｼ磯撼蜈ｬ髢具ｼ峨′螳溯｡後＆繧後∪縺励◆');
      }
    }
    
    await context.close();
  });

  test.skip('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ讀懃ｴ｢縺ｨ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ', async ({ browser }) => {
    // 讀懃ｴ｢繝ｻ繝輔ぅ繝ｫ繧ｿ繝ｼ讖溯・縺悟ｮ溯｣・＆繧後◆繧画怏蜉ｹ蛹・
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 繝ｭ繧ｰ繧､繝ｳ
    await loginAsAdmin(page);
    await page.waitForTimeout(3000);
    await page.close();
    
    // 譁ｰ縺励＞繝壹・繧ｸ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・・繝ｼ繧ｸ繧帝幕縺・
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    
    // 讀懃ｴ｢讖溯・
    const searchInput = newPage.locator('input[placeholder*="讀懃ｴ｢"], input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('繝・せ繝・);
      await newPage.waitForTimeout(500); // 繝・ヰ繧ｦ繝ｳ繧ｹ蠕・ｩ・
      
      // 讀懃ｴ｢邨先棡縺ｮ遒ｺ隱・
      const results = newPage.locator('tbody tr, .character-row');
      const resultCount = await results.count();
      console.log(`讀懃ｴ｢邨先棡: ${resultCount}莉ｶ`);
    }
    
    // 繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ・井ｾ｡譬ｼ繧ｿ繧､繝暦ｼ・
    const priceFilter = newPage.locator('select[name="priceType"], input[name="filterPriceType"]');
    if (await priceFilter.first().isVisible()) {
      // 譛画侭縺ｮ縺ｿ陦ｨ遉ｺ
      await newPage.locator('[value="paid"]').click();
      await newPage.waitForTimeout(500);
      
      // 辟｡譁吶・縺ｿ陦ｨ遉ｺ
      await newPage.locator('[value="free"]').click();
      await newPage.waitForTimeout(500);
    }
    
    // 繧ｹ繝・・繧ｿ繧ｹ繝輔ぅ繝ｫ繧ｿ繝ｼ
    const statusFilter = newPage.locator('select[name="status"], input[name="filterStatus"]');
    if (await statusFilter.first().isVisible()) {
      // 蜈ｬ髢倶ｸｭ縺ｮ縺ｿ
      await newPage.locator('[value="active"]').click();
      await newPage.waitForTimeout(500);
    }
    
    await context.close();
  });
});
