#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * 翻訳ファイルの検証スクリプト
 * ビルド前に実行して、必要なキーが存在することを確認
 */

// メッセージをフラット化
function flattenMessages(messages, prefix = '') {
  const flattened = {};
  
  Object.keys(messages).forEach((key) => {
    const value = messages[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string') {
      flattened[newKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(flattened, flattenMessages(value, newKey));
    }
  });
  
  return flattened;
}

// コンポーネントから使用されている翻訳キーを抽出
function extractUsedKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = new Set();
  
  // useTranslations('namespace') パターン
  const namespaceMatches = content.matchAll(/useTranslations\(['"]([^'"]+)['"]\)/g);
  for (const match of namespaceMatches) {
    const namespace = match[1];
    
    // t('key') パターン
    const keyMatches = content.matchAll(/\bt\(['"]([^'"]+)['"]/g);
    for (const keyMatch of keyMatches) {
      keys.add(`${namespace}.${keyMatch[1]}`);
    }
  }
  
  return Array.from(keys);
}

// メイン処理
async function main() {
  console.log('🔍 Validating translation files...\n');
  
  // 翻訳ファイルを読み込み
  const jaMessages = JSON.parse(fs.readFileSync(path.join(__dirname, '../messages/ja.json'), 'utf8'));
  const enMessages = JSON.parse(fs.readFileSync(path.join(__dirname, '../messages/en.json'), 'utf8'));
  
  const jaFlat = flattenMessages(jaMessages);
  const enFlat = flattenMessages(enMessages);
  
  console.log(`📚 Japanese keys: ${Object.keys(jaFlat).length}`);
  console.log(`📚 English keys: ${Object.keys(enFlat).length}\n`);
  
  // コンポーネントファイルを検索
  const componentFiles = glob.sync('app/**/*.{ts,tsx}', { 
    cwd: path.join(__dirname, '..'),
    ignore: ['**/node_modules/**']
  });
  
  const usedKeys = new Set();
  componentFiles.forEach(file => {
    const keys = extractUsedKeys(path.join(__dirname, '..', file));
    keys.forEach(key => usedKeys.add(key));
  });
  
  console.log(`🔑 Used translation keys: ${usedKeys.size}\n`);
  
  // 不足しているキーをチェック
  const missingInJa = [];
  const missingInEn = [];
  
  usedKeys.forEach(key => {
    if (!jaFlat[key]) missingInJa.push(key);
    if (!enFlat[key]) missingInEn.push(key);
  });
  
  // 結果を表示
  if (missingInJa.length > 0) {
    console.error('❌ Missing keys in ja.json:');
    missingInJa.forEach(key => console.error(`   - ${key}`));
    console.error('');
  }
  
  if (missingInEn.length > 0) {
    console.error('❌ Missing keys in en.json:');
    missingInEn.forEach(key => console.error(`   - ${key}`));
    console.error('');
  }
  
  if (missingInJa.length === 0 && missingInEn.length === 0) {
    console.log('✅ All translation keys are present!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});