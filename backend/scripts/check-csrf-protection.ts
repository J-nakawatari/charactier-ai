#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';

// 重要なエンドポイントのリスト（CSRF保護が必須）
const CRITICAL_ENDPOINTS = [
  // チャット関連（トークン消費）
  { method: 'POST', path: '/chats/:characterId/messages', description: 'チャットメッセージ送信' },
  
  // 購入関連
  { method: 'POST', path: '/characters/:id/purchase', description: 'キャラクター購入' },
  { method: 'POST', path: '/tokens/purchase', description: 'トークン購入' },
  { method: 'POST', path: '/stripe/create-payment-intent', description: 'Stripe決済開始' },
  
  // ユーザーデータ変更
  { method: 'PUT', path: '/user/profile', description: 'プロフィール更新' },
  { method: 'PUT', path: '/user/settings', description: '設定変更' },
  { method: 'DELETE', path: '/user/delete-account', description: 'アカウント削除' },
  
  // 管理者操作
  { method: 'POST', path: '/admin/characters', description: 'キャラクター作成' },
  { method: 'PUT', path: '/admin/characters/:id', description: 'キャラクター更新' },
  { method: 'DELETE', path: '/admin/characters/:id', description: 'キャラクター削除' },
];

// ファイルから保護されているエンドポイントを抽出
function findProtectedEndpoints(filePath: string): Set<string> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const protectedEndpoints = new Set<string>();
  
  // routeRegistry.defineでverifyCsrfTokenを使用している行を探す
  const routePattern = /routeRegistry\.define\s*\(\s*['"](\w+)['"]\s*,\s*[`'"]([^'"]+)['"]\s*,.*verifyCsrfToken/g;
  let match;
  
  while ((match = routePattern.exec(content)) !== null) {
    const method = match[1];
    const path = match[2];
    protectedEndpoints.add(`${method} ${path}`);
  }
  
  // 通常のrouter.methodパターンも確認
  const routerPattern = /router\.(post|put|delete|patch)\s*\(\s*[`'"]([^'"]+)['"]\s*,.*verifyCsrfToken/gi;
  while ((match = routerPattern.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const path = match[2];
    protectedEndpoints.add(`${method} ${path}`);
  }
  
  return protectedEndpoints;
}

// メイン処理
async function checkCsrfProtection() {
  console.log('🔍 CSRF保護チェックを開始します...\n');
  
  const protectedEndpoints = new Set<string>();
  const errors: string[] = [];
  
  // src/index.tsをチェック
  const indexPath = path.join(__dirname, '../src/index.ts');
  if (fs.existsSync(indexPath)) {
    const indexProtected = findProtectedEndpoints(indexPath);
    indexProtected.forEach(ep => protectedEndpoints.add(ep));
  }
  
  // routesディレクトリ内のファイルをチェック
  const routesDir = path.join(__dirname, '../src/routes');
  if (fs.existsSync(routesDir)) {
    const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));
    files.forEach(file => {
      const filePath = path.join(routesDir, file);
      const fileProtected = findProtectedEndpoints(filePath);
      fileProtected.forEach(ep => protectedEndpoints.add(ep));
    });
  }
  
  console.log(`✅ 保護されているエンドポイント: ${protectedEndpoints.size}個\n`);
  protectedEndpoints.forEach(ep => {
    console.log(`  - ${ep}`);
  });
  
  console.log('\n📋 重要なエンドポイントの保護状態:\n');
  
  let unprotectedCount = 0;
  
  CRITICAL_ENDPOINTS.forEach(endpoint => {
    const key = `${endpoint.method} ${endpoint.path}`;
    const isProtected = Array.from(protectedEndpoints).some(ep => {
      // パスパラメータを考慮した比較
      const epParts = ep.split(' ');
      const keyParts = key.split(' ');
      if (epParts[0] !== keyParts[0]) return false;
      
      const epPath = epParts[1].replace(/:[^/]+/g, ':param');
      const keyPath = keyParts[1].replace(/:[^/]+/g, ':param');
      
      return epPath === keyPath;
    });
    
    if (isProtected) {
      console.log(`  ✅ ${endpoint.method} ${endpoint.path} - ${endpoint.description}`);
    } else {
      console.log(`  ❌ ${endpoint.method} ${endpoint.path} - ${endpoint.description}`);
      errors.push(`${endpoint.method} ${endpoint.path} (${endpoint.description}) is not protected!`);
      unprotectedCount++;
    }
  });
  
  console.log(`\n📊 結果: ${CRITICAL_ENDPOINTS.length - unprotectedCount}/${CRITICAL_ENDPOINTS.length} の重要なエンドポイントが保護されています`);
  
  if (errors.length > 0) {
    console.error('\n❌ エラー: 以下の重要なエンドポイントがCSRF保護されていません:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  } else {
    console.log('\n✅ すべての重要なエンドポイントが適切にCSRF保護されています！');
  }
}

// 実行
checkCsrfProtection().catch(error => {
  console.error('エラーが発生しました:', error);
  process.exit(1);
});