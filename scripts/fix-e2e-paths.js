const fs = require('fs');
const path = require('path');
const glob = require('glob');

// URLパスの修正マッピング
const pathMappings = {
  '/ja/auth/login': '/ja/login',
  '/ja/auth/register': '/ja/register',
  '/ja/auth/logout': '/ja/logout',
  '/en/auth/login': '/en/login',
  '/en/auth/register': '/en/register',
  '/en/auth/logout': '/en/logout',
};

// E2Eテストファイルを検索
const testFiles = glob.sync('tests/e2e/**/*.spec.ts');

console.log(`Found ${testFiles.length} test files`);

let totalReplacements = 0;

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  
  // 各パスマッピングを適用
  Object.entries(pathMappings).forEach(([oldPath, newPath]) => {
    if (content.includes(oldPath)) {
      content = content.replace(new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newPath);
      modified = true;
      totalReplacements++;
    }
  });
  
  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`✅ Updated: ${file}`);
  }
});

console.log(`\n✨ Done! Made ${totalReplacements} replacements`);