#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

const indexPath = path.join(__dirname, '../index.ts');
const content = fs.readFileSync(indexPath, 'utf-8');

// 置換パターン - '/api/v1' を `${API_PREFIX}` に変更
const replacements = [
  // app.use() パターン
  { from: /app\.use\('\/api\/v1\//g, to: "app.use(`${API_PREFIX}/" },
  { from: /app\.use\('\/api\/v1'/g, to: "app.use(API_PREFIX" },
  
  // routeRegistry.mount() パターン
  { from: /routeRegistry\.mount\('\/api\/v1\//g, to: "routeRegistry.mount(`${API_PREFIX}/" },
  
  // app.get/post/put/delete パターン
  { from: /app\.(get|post|put|delete|patch)\('\/api\/v1\//g, to: "app.$1(`${API_PREFIX}/" },
  
  // レート制限パス
  { from: /'\/api\/v1\//g, to: "`${API_PREFIX}/" },
];

let updatedContent = content;

// 置換を実行
replacements.forEach(({ from, to }) => {
  const beforeCount = (updatedContent.match(from) || []).length;
  updatedContent = updatedContent.replace(from, to);
  const afterCount = beforeCount;
  if (afterCount > 0) {
    console.log(`✅ Replaced ${afterCount} occurrences of ${from}`);
  }
});

// ファイルに書き込む
fs.writeFileSync(indexPath, updatedContent);
console.log('✅ Update to API_PREFIX completed successfully!');