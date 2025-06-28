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
    } else if (Array.isArray(value)) {
      // 配列も有効な値として扱う
      flattened[newKey] = JSON.stringify(value);
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
  const namespaceAliases = new Map(); // 例: tFooter -> footer
  
  // useTranslations('namespace') パターン
  const namespaceMatches = content.matchAll(/const\s+(\w+)\s*=\s*useTranslations\(['"]([^'"]+)['"]\)/g);
  for (const match of namespaceMatches) {
    const varName = match[1];
    const namespace = match[2];
    namespaceAliases.set(varName, namespace);
  }
  
  // 通常のuseTranslations('namespace')パターン（変数に代入されていない場合）
  const simpleNamespaceMatches = content.matchAll(/useTranslations\(['"]([^'"]+)['"]\)/g);
  for (const match of simpleNamespaceMatches) {
    if (!content.includes(`const`) || !content.includes(`= useTranslations('${match[1]}')`)) {
      namespaceAliases.set('t', match[1]);
    }
  }
  
  // t('key') または tFooter('key') パターン
  const keyMatches = content.matchAll(/\b(\w+)\(['"]([^'"]+)['"]/g);
  for (const keyMatch of keyMatches) {
    const varName = keyMatch[1];
    const key = keyMatch[2];
    
    if (namespaceAliases.has(varName)) {
      const namespace = namespaceAliases.get(varName);
      keys.add(`${namespace}.${key}`);
    }
  }
  
  // t.raw('key') パターン
  const rawKeyMatches = content.matchAll(/\b(\w+)\.raw\(['"]([^'"]+)['"]\)/g);
  for (const keyMatch of rawKeyMatches) {
    const varName = keyMatch[1];
    const key = keyMatch[2];
    
    if (namespaceAliases.has(varName)) {
      const namespace = namespaceAliases.get(varName);
      keys.add(`${namespace}.${key}`);
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