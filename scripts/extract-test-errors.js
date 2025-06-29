#!/usr/bin/env node

/**
 * E2Eテストのエラー結果を抽出するスクリプト
 * 
 * 使い方:
 * 1. テストを実行してJSONレポートを生成:
 *    npx playwright test --reporter=json > test-results.json 2>&1
 * 
 * 2. このスクリプトでエラーを抽出:
 *    node scripts/extract-test-errors.js
 */

const fs = require('fs');
const path = require('path');

// 1. JSONレポートからエラーを抽出
function extractFromJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const results = JSON.parse(data);
    
    const errors = [];
    const summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0
    };

    // テスト結果を解析
    if (results.suites) {
      results.suites.forEach(suite => {
        processSuite(suite, errors, summary);
      });
    }

    return { errors, summary };
  } catch (error) {
    console.error('JSONファイルの読み込みエラー:', error.message);
    return null;
  }
}

function processSuite(suite, errors, summary) {
  if (suite.suites) {
    suite.suites.forEach(s => processSuite(s, errors, summary));
  }
  
  if (suite.specs) {
    suite.specs.forEach(spec => {
      spec.tests?.forEach(test => {
        summary.total++;
        
        if (test.status === 'passed') {
          summary.passed++;
        } else if (test.status === 'failed') {
          summary.failed++;
          
          // エラー情報を抽出
          const error = {
            file: spec.file || spec.title,
            title: test.title,
            status: test.status,
            error: test.results?.[0]?.error?.message || 'Unknown error',
            duration: test.results?.[0]?.duration || 0
          };
          errors.push(error);
        } else if (test.status === 'skipped') {
          summary.skipped++;
        } else if (test.status === 'flaky') {
          summary.flaky++;
        }
      });
    });
  }
}

// 2. リスト形式のレポートからエラーを抽出
function extractFromListReport(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n');
    
    const errors = [];
    let currentTest = null;
    let captureError = false;
    let errorLines = [];
    
    lines.forEach(line => {
      // 失敗したテストを検出
      if (line.includes('✗') || line.includes('✕')) {
        if (currentTest && errorLines.length > 0) {
          errors.push({
            test: currentTest,
            error: errorLines.join('\n')
          });
        }
        currentTest = line.trim();
        captureError = true;
        errorLines = [];
      }
      // エラーメッセージをキャプチャ
      else if (captureError && (line.includes('Error:') || line.includes('Expected') || line.includes('Timeout'))) {
        errorLines.push(line.trim());
      }
      // 次のテストが始まったらキャプチャを停止
      else if (line.includes('✓') && captureError) {
        if (currentTest && errorLines.length > 0) {
          errors.push({
            test: currentTest,
            error: errorLines.join('\n')
          });
        }
        captureError = false;
        currentTest = null;
        errorLines = [];
      }
    });
    
    // 最後のエラーを追加
    if (currentTest && errorLines.length > 0) {
      errors.push({
        test: currentTest,
        error: errorLines.join('\n')
      });
    }
    
    return errors;
  } catch (error) {
    console.error('ファイルの読み込みエラー:', error.message);
    return null;
  }
}

// 3. エラーパターンを分析
function analyzeErrors(errors) {
  const patterns = {
    timeout: [],
    elementNotFound: [],
    networkError: [],
    assertionFailed: [],
    other: []
  };
  
  errors.forEach(error => {
    const errorMsg = error.error || error.message || '';
    
    if (errorMsg.includes('Timeout') || errorMsg.includes('timeout')) {
      patterns.timeout.push(error);
    } else if (errorMsg.includes('not found') || errorMsg.includes('no element') || errorMsg.includes('locator')) {
      patterns.elementNotFound.push(error);
    } else if (errorMsg.includes('ERR_') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('fetch')) {
      patterns.networkError.push(error);
    } else if (errorMsg.includes('Expected') || errorMsg.includes('toBe') || errorMsg.includes('assertion')) {
      patterns.assertionFailed.push(error);
    } else {
      patterns.other.push(error);
    }
  });
  
  return patterns;
}

// メイン処理
async function main() {
  console.log('📊 E2Eテストエラー抽出ツール\n');
  
  // JSONレポートがある場合
  const jsonPath = path.join(process.cwd(), 'test-results.json');
  if (fs.existsSync(jsonPath)) {
    console.log('JSONレポートを解析中...\n');
    const result = extractFromJSON(jsonPath);
    
    if (result) {
      // サマリーを表示
      console.log('## テスト結果サマリー');
      console.log(`総テスト数: ${result.summary.total}`);
      console.log(`✓ 成功: ${result.summary.passed}`);
      console.log(`✗ 失敗: ${result.summary.failed}`);
      console.log(`⊘ スキップ: ${result.summary.skipped}`);
      console.log(`≈ 不安定: ${result.summary.flaky}\n`);
      
      if (result.errors.length > 0) {
        // エラーパターンを分析
        const patterns = analyzeErrors(result.errors);
        
        console.log('## エラーパターン分析\n');
        Object.entries(patterns).forEach(([type, errors]) => {
          if (errors.length > 0) {
            console.log(`### ${type} (${errors.length}件)`);
            errors.slice(0, 3).forEach((error, i) => {
              console.log(`${i + 1}. ${error.file || error.test}`);
              console.log(`   ${error.error.substring(0, 150)}...`);
            });
            console.log();
          }
        });
        
        // 詳細なエラーリストを保存
        fs.writeFileSync('test-errors-detailed.json', JSON.stringify(result.errors, null, 2));
        console.log('💾 詳細なエラー情報を test-errors-detailed.json に保存しました。');
      }
    }
  }
  
  // リスト形式のレポートがある場合
  const listPath = path.join(process.cwd(), 'test-results.txt');
  if (fs.existsSync(listPath)) {
    console.log('\nリスト形式のレポートを解析中...\n');
    const errors = extractFromListReport(listPath);
    
    if (errors && errors.length > 0) {
      console.log(`## 失敗したテスト (${errors.length}件)\n`);
      errors.slice(0, 10).forEach((error, i) => {
        console.log(`${i + 1}. ${error.test}`);
        console.log(`   ${error.error}\n`);
      });
      
      fs.writeFileSync('test-errors-list.json', JSON.stringify(errors, null, 2));
      console.log('💾 エラーリストを test-errors-list.json に保存しました。');
    }
  }
  
  // 使い方を表示
  if (!fs.existsSync(jsonPath) && !fs.existsSync(listPath)) {
    console.log('テスト結果ファイルが見つかりません。\n');
    console.log('使い方:');
    console.log('1. JSONレポートを生成:');
    console.log('   npx playwright test --reporter=json > test-results.json 2>&1\n');
    console.log('2. またはリスト形式で生成:');
    console.log('   npx playwright test --reporter=list > test-results.txt 2>&1\n');
    console.log('3. このスクリプトを実行:');
    console.log('   node scripts/extract-test-errors.js');
  }
}

// Windows用のPowerShellスクリプトも生成
function generatePowerShellScript() {
  const psScript = `
# E2Eテストエラー抽出 (PowerShell版)

Write-Host "📊 E2Eテストエラー抽出ツール (PowerShell版)" -ForegroundColor Cyan

# テスト実行とエラー抽出
Write-Host "テストを実行中..." -ForegroundColor Yellow
npx playwright test --reporter=list 2>&1 | Tee-Object -FilePath test-results-ps.txt

# エラーのみ抽出
$errors = Get-Content test-results-ps.txt | Select-String -Pattern "✗|Error:|Timeout|Expected"

# サマリー表示
$totalTests = (Get-Content test-results-ps.txt | Select-String -Pattern "✓|✗").Count
$failedTests = (Get-Content test-results-ps.txt | Select-String -Pattern "✗").Count
$passedTests = $totalTests - $failedTests

Write-Host ""
Write-Host "## テスト結果サマリー" -ForegroundColor Green
Write-Host "総テスト数: $totalTests"
Write-Host "✓ 成功: $passedTests" -ForegroundColor Green
Write-Host "✗ 失敗: $failedTests" -ForegroundColor Red

# エラーを表示
if ($failedTests -gt 0) {
    Write-Host ""
    Write-Host "## 失敗したテスト" -ForegroundColor Red
    $errors | Select-Object -First 20 | ForEach-Object { Write-Host $_ }
    
    # ファイルに保存
    $errors | Out-File -FilePath test-errors-ps.txt
    Write-Host ""
    Write-Host "💾 エラー詳細を test-errors-ps.txt に保存しました。" -ForegroundColor Yellow
}
`;

  fs.writeFileSync('extract-test-errors.ps1', psScript);
  console.log('\n💡 PowerShell版も生成しました: extract-test-errors.ps1');
}

// 実行
main().then(() => {
  generatePowerShellScript();
}).catch(console.error);