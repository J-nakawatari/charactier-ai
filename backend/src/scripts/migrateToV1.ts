#!/usr/bin/env node

/**
 * このスクリプトは、backend/src/index.tsのすべてのAPIルートを
 * /api/ から /api/v1/ に移行するための自動化スクリプトです。
 */

import fs from 'fs';
import path from 'path';

const indexPath = path.join(__dirname, '../index.ts');
const backupPath = path.join(__dirname, '../index.ts.backup');

// バックアップを作成
fs.copyFileSync(indexPath, backupPath);
console.log(`✅ Backup created at: ${backupPath}`);

// ファイルの内容を読み込む
let content = fs.readFileSync(indexPath, 'utf-8');

// 置換パターン
const replacements = [
  // app.use() パターン
  { from: /app\.use\('\/api\/auth'/g, to: "app.use('/api/v1/auth'" },
  { from: /app\.use\('\/api\/user'/g, to: "app.use('/api/v1/user'" },
  { from: /app\.use\('\/api\/admin\/models'/g, to: "app.use('/api/v1/admin/models'" },
  { from: /app\.use\('\/api\/system-settings'/g, to: "app.use('/api/v1/system-settings'" },
  { from: /app\.use\('\/api\/admin\/system'/g, to: "app.use('/api/v1/admin/system'" },
  { from: /app\.use\('\/api\/debug'/g, to: "app.use('/api/v1/debug'" },
  { from: /app\.use\('\/api\/characters'/g, to: "app.use('/api/v1/characters'" },
  { from: /app\.use\('\/api\/notifications'/g, to: "app.use('/api/v1/notifications'" },
  { from: /app\.use\('\/api\/admin'/g, to: "app.use('/api/v1/admin'" },
  { from: /app\.use\('\/api\/payment'/g, to: "app.use('/api/v1/payment'" },
  { from: /app\.use\('\/api\/purchase'/g, to: "app.use('/api/v1/purchase'" },
  { from: /app\.use\('\/api\/token-packs'/g, to: "app.use('/api/v1/token-packs'" },
  { from: /app\.use\('\/api\/upload'/g, to: "app.use('/api/v1/upload'" },
  { from: /app\.use\('\/api\',/g, to: "app.use('/api/v1'," },
  
  // routeRegistry.mount() パターン
  { from: /routeRegistry\.mount\('\/api\/debug'/g, to: "routeRegistry.mount('/api/v1/debug'" },
  { from: /routeRegistry\.mount\('\/api\/admin\/users'/g, to: "routeRegistry.mount('/api/v1/admin/users'" },
  { from: /routeRegistry\.mount\('\/api\/admin\/token-packs'/g, to: "routeRegistry.mount('/api/v1/admin/token-packs'" },
  { from: /routeRegistry\.mount\('\/api\/admin\/token-usage'/g, to: "routeRegistry.mount('/api/v1/admin/token-usage'" },
  { from: /routeRegistry\.mount\('\/api\/admin\/security'/g, to: "routeRegistry.mount('/api/v1/admin/security'" },
  { from: /routeRegistry\.mount\('\/api\/characters'/g, to: "routeRegistry.mount('/api/v1/characters'" },
  { from: /routeRegistry\.mount\('\/api\/notifications'/g, to: "routeRegistry.mount('/api/v1/notifications'" },
  
  // app.get/post/put/delete パターン
  { from: /app\.(get|post|put|delete|patch)\('\/api\//g, to: "app.$1('/api/v1/" },
  
  // 特定のエンドポイント
  { from: /'\/api\/ping'/g, to: "'/api/v1/ping'" },
  { from: /'\/api\/exchange-rate'/g, to: "'/api/v1/exchange-rate'" },
  
  // レート制限パス
  { from: /'\/api\/auth\/login'/g, to: "'/api/v1/auth/login'" },
  { from: /'\/api\/auth\/register'/g, to: "'/api/v1/auth/register'" },
  { from: /'\/api\/auth\/refresh'/g, to: "'/api/v1/auth/refresh'" },
  { from: /'\/api\/auth\/forgot-password'/g, to: "'/api/v1/auth/forgot-password'" },
  { from: /'\/api\/chats\/:characterId\/messages'/g, to: "'/api/v1/chats/:characterId/messages'" },
];

// 置換を実行
replacements.forEach(({ from, to }) => {
  const beforeCount = (content.match(from) || []).length;
  content = content.replace(from, to);
  const afterCount = beforeCount;
  if (afterCount > 0) {
    console.log(`✅ Replaced ${afterCount} occurrences of ${from}`);
  }
});

// ファイルに書き込む
fs.writeFileSync(indexPath, content);
console.log('✅ Migration completed successfully!');
console.log('⚠️  Please review the changes and test thoroughly before deploying.');