#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// E2Eテストエラーを分析して効率的に修正するスクリプト

console.log('🔍 E2Eテストエラー分析ツール\n');

// 共通のエラーパターンと解決策
const commonPatterns = {
  'strict mode violation': {
    pattern: /strict mode violation.*resolved to \d+ elements/,
    solution: 'セレクタをより具体的にする（:has-text(), nth(), first()を使用）',
    example: "page.locator('h1:has-text(\"特定のテキスト\")')"
  },
  'element is not visible': {
    pattern: /element is not visible/,
    solution: 'waitFor()で要素の表示を待つか、別のセレクタを試す',
    example: "await element.waitFor({ state: 'visible' })"
  },
  'timeout exceeded': {
    pattern: /timeout of \d+ms exceeded/,
    solution: 'waitForLoadState()やwaitForResponse()を追加',
    example: "await page.waitForLoadState('networkidle')"
  },
  'element not found': {
    pattern: /waiting for locator.*no such element/,
    solution: 'セレクタが正しいか確認、またはページ遷移を待つ',
    example: "await page.waitForSelector('selector', { timeout: 5000 })"
  },
  'navigation timeout': {
    pattern: /navigation timeout/,
    solution: 'waitForURL()を使用するか、タイムアウトを延長',
    example: "await page.waitForURL('**/path', { timeout: 30000 })"
  }
};

// テスト結果ファイルを解析
function analyzeTestResults() {
  try {
    // Playwrightのテスト結果を取得
    console.log('📊 テスト実行中...\n');
    const output = execSync('npm run test:e2e -- --reporter=json', { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    return JSON.parse(output);
  } catch (error) {
    // エラー出力から情報を抽出
    const errorOutput = error.stdout?.toString() || error.stderr?.toString() || '';
    return parseErrorOutput(errorOutput);
  }
}

// エラー出力をパース
function parseErrorOutput(output) {
  const errors = [];
  const lines = output.split('\n');
  
  let currentError = null;
  for (const line of lines) {
    if (line.includes('Error:')) {
      if (currentError) errors.push(currentError);
      currentError = {
        message: line,
        file: '',
        line: 0,
        suggestion: ''
      };
    } else if (currentError && line.includes('.spec.ts:')) {
      const match = line.match(/([^:]+\.spec\.ts):(\d+)/);
      if (match) {
        currentError.file = match[1];
        currentError.line = parseInt(match[2]);
      }
    }
  }
  if (currentError) errors.push(currentError);
  
  return errors;
}

// エラーパターンをマッチング
function matchErrorPattern(error) {
  for (const [key, pattern] of Object.entries(commonPatterns)) {
    if (pattern.pattern.test(error.message)) {
      return {
        type: key,
        solution: pattern.solution,
        example: pattern.example
      };
    }
  }
  return null;
}

// 修正提案を生成
function generateFixSuggestions(errors) {
  const suggestions = {};
  
  for (const error of errors) {
    const pattern = matchErrorPattern(error);
    if (!pattern) continue;
    
    const file = error.file || 'unknown';
    if (!suggestions[file]) {
      suggestions[file] = [];
    }
    
    suggestions[file].push({
      line: error.line,
      error: error.message.substring(0, 100) + '...',
      solution: pattern.solution,
      example: pattern.example
    });
  }
  
  return suggestions;
}

// バッチ修正スクリプトを生成
function generateBatchFixScript(suggestions) {
  let script = `#!/bin/bash
# E2Eテスト自動修正スクリプト
# 生成日: ${new Date().toISOString()}

set -e

echo "🔧 E2Eテストの自動修正を開始します..."

`;

  for (const [file, fixes] of Object.entries(suggestions)) {
    script += `\n# ${file} の修正\n`;
    script += `echo "📝 ${file} を修正中..."\n`;
    
    // ファイルごとの修正コマンドを追加
    for (const fix of fixes) {
      script += `# Line ${fix.line}: ${fix.error}\n`;
      script += `# 解決策: ${fix.solution}\n`;
      script += `# 例: ${fix.example}\n\n`;
    }
  }
  
  script += `\necho "✅ 修正スクリプトの生成が完了しました。手動で確認して実行してください。"\n`;
  
  return script;
}

// テストヘルパー関数を生成
function generateTestHelpers() {
  const helpers = `// E2Eテストヘルパー関数
// 共通のパターンを簡潔に処理

export const testHelpers = {
  // 管理者ログイン
  async adminLogin(page, email = 'admin@example.com', password = 'admin123') {
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  },

  // 要素の安全な取得
  async safeGetElement(page, selector, options = {}) {
    try {
      const element = page.locator(selector);
      await element.waitFor({ state: 'visible', timeout: options.timeout || 5000 });
      return element;
    } catch (error) {
      console.log(\`⚠️ 要素が見つかりません: \${selector}\`);
      return null;
    }
  },

  // テキストを含む要素を取得
  async getByText(page, text, tag = '*') {
    return page.locator(\`\${tag}:has-text("\${text}")\`).first();
  },

  // フォーム入力
  async fillForm(page, fields) {
    for (const [name, value] of Object.entries(fields)) {
      const input = await this.safeGetElement(page, \`input[name="\${name}"]\`);
      if (input) {
        await input.fill(value.toString());
      }
    }
  },

  // API応答を待つ
  async waitForApiResponse(page, urlPattern, method = 'GET') {
    return page.waitForResponse(
      response => response.url().includes(urlPattern) && 
                  response.request().method() === method
    );
  },

  // 成功メッセージを待つ
  async waitForSuccess(page) {
    const selectors = [
      '.toast-success',
      '.success-message',
      '[role="alert"]:has-text("成功")',
      '.Toastify__toast--success'
    ];
    
    for (const selector of selectors) {
      try {
        await page.locator(selector).waitFor({ state: 'visible', timeout: 3000 });
        return true;
      } catch {}
    }
    return false;
  }
};
`;

  return helpers;
}

// メイン処理
async function main() {
  console.log('1️⃣ テストエラーを収集中...\n');
  const errors = analyzeTestResults();
  
  if (errors.length === 0) {
    console.log('✅ エラーが見つかりませんでした！');
    return;
  }
  
  console.log(`❌ ${errors.length}個のエラーが見つかりました\n`);
  
  console.log('2️⃣ エラーパターンを分析中...\n');
  const suggestions = generateFixSuggestions(errors);
  
  console.log('3️⃣ 修正提案を生成中...\n');
  
  // 修正提案を表示
  for (const [file, fixes] of Object.entries(suggestions)) {
    console.log(`📄 ${file}:`);
    for (const fix of fixes) {
      console.log(`  Line ${fix.line}: ${fix.solution}`);
      console.log(`  例: ${fix.example}\n`);
    }
  }
  
  // バッチ修正スクリプトを保存
  const batchScript = generateBatchFixScript(suggestions);
  fs.writeFileSync('fix-e2e-tests.sh', batchScript, { mode: 0o755 });
  console.log('💾 バッチ修正スクリプトを fix-e2e-tests.sh に保存しました\n');
  
  // テストヘルパーを保存
  const helpers = generateTestHelpers();
  fs.writeFileSync('tests/e2e/helpers.ts', helpers);
  console.log('💾 テストヘルパー関数を tests/e2e/helpers.ts に保存しました\n');
  
  console.log('📌 推奨される次のステップ:');
  console.log('1. ./fix-e2e-tests.sh を確認して実行');
  console.log('2. tests/e2e/helpers.ts のヘルパー関数を使用してテストを簡潔に');
  console.log('3. 共通パターンは base.spec.ts に抽出して再利用\n');
}

// スクリプト実行
if (require.main === module) {
  main().catch(console.error);
}