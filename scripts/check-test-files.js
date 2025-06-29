const fs = require('fs');
const path = require('path');
const glob = require('glob');

// E2Eテストファイルを検索
const testFiles = glob.sync('tests/e2e/**/*.spec.ts');

console.log(`\n📊 E2Eテストファイル分析\n`);
console.log(`総ファイル数: ${testFiles.length}`);

let emptyFiles = [];
let invalidFiles = [];
let validFiles = [];

testFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // 空ファイルチェック
  if (content.trim().length === 0) {
    emptyFiles.push(file);
    return;
  }
  
  // テスト記述があるかチェック
  if (!content.includes('test(') && !content.includes('test.describe(')) {
    invalidFiles.push(file);
    return;
  }
  
  validFiles.push(file);
});

console.log(`\n✅ 有効なテスト: ${validFiles.length}`);
console.log(`❌ 空のファイル: ${emptyFiles.length}`);
console.log(`⚠️  無効なファイル: ${invalidFiles.length}`);

if (emptyFiles.length > 0) {
  console.log('\n空のファイル:');
  emptyFiles.forEach(f => console.log(`  - ${f}`));
}

if (invalidFiles.length > 0) {
  console.log('\n無効なファイル:');
  invalidFiles.forEach(f => console.log(`  - ${f}`));
}

// 修正が必要なファイルをJSONに出力
const needsFix = [...emptyFiles, ...invalidFiles];
fs.writeFileSync('tests-need-fix.json', JSON.stringify(needsFix, null, 2));
console.log(`\n💾 修正が必要なファイルリストを tests-need-fix.json に保存しました`);