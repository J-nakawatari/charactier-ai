#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';

// 重要なエンドポイントのリスト（CSRF保護が必須）
const CRITICAL_ENDPOINTS = [
  // チャット関連（トークン消費）
  { method: 'POST', path: '/api/v1/chats/:characterId/messages', description: 'チャットメッセージ送信' },
  
  // ユーザーデータ変更
  { method: 'PUT', path: '/api/v1/user/profile', description: 'プロフィール更新' },
  { method: 'PUT', path: '/api/v1/user/change-password', description: 'パスワード変更' },
  { method: 'DELETE', path: '/api/v1/user/delete-account', description: 'アカウント削除' },
  
  // 管理者操作 - ユーザー管理
  { method: 'PUT', path: '/api/v1/admin/users/:id/status', description: '管理者：ユーザーステータス変更' },
  { method: 'DELETE', path: '/api/v1/admin/users/:id', description: '管理者：ユーザー削除' },
  { method: 'DELETE', path: '/api/v1/admin/admins/:id', description: '管理者：管理者削除' },
  
  // 管理者操作 - キャラクター管理
  { method: 'DELETE', path: '/api/v1/admin/characters/:id', description: '管理者：キャラクター削除' },
  
  // 管理者操作 - システム
  { method: 'DELETE', path: '/api/v1/admin/cache/character/:characterId', description: '管理者：キャッシュ削除' },
];

// ファイルから保護されているエンドポイントを抽出
function findProtectedEndpoints(filePath: string): Set<string> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const protectedEndpoints = new Set<string>();
  
  // routeRegistry.defineでverifyCsrfTokenを使用している行を探す
  const routePattern = /routeRegistry\.define\s*\(\s*['"](\w+)['"]\s*,\s*[`'"]([^'"]+)[`'"]\s*,.*verifyCsrfToken/g;
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
  
  // デバッグ：正規化された検出パス
  console.log('\n🔍 デバッグ：正規化された保護パス');
  protectedEndpoints.forEach(ep => {
    const epParts = ep.split(' ');
    let epPath = epParts[1].replace(/\$\{API_PREFIX\}/g, '/api/v1');
    epPath = epPath.replace(/:[^/]+/g, ':param');
    console.log(`  ${epParts[0]} ${epPath}`);
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
      
      // API_PREFIXを考慮した比較
      let epPath = epParts[1].replace(/\$\{API_PREFIX\}/g, '/api/v1');
      let keyPath = keyParts[1];
      
      // パスパラメータを正規化
      epPath = epPath.replace(/:[^/]+/g, ':param');
      keyPath = keyPath.replace(/:[^/]+/g, ':param');
      
      // adminCharactersルートの場合、prefix付きでマッチング
      if (epPath === '/:param' && keyPath === '/api/v1/admin/characters/:param') {
        return true;
      }
      
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