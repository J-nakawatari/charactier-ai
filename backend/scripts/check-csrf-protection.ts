#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';

// 重要なエンドポイントのリスト（CSRF保護が必須）
const CRITICAL_ENDPOINTS = [
  // 認証関連
  { method: 'POST', path: '/api/v1/auth/register', description: '新規会員登録' },
  { method: 'POST', path: '/api/v1/auth/login', description: 'ログイン' },
  { method: 'POST', path: '/api/v1/auth/logout', description: 'ログアウト' },
  { method: 'POST', path: '/api/v1/auth/admin/logout', description: '管理者ログアウト' },
  { method: 'POST', path: '/api/v1/auth/user/setup-complete', description: 'セットアップ完了' },
  { method: 'POST', path: '/api/v1/auth/resend-verification', description: '認証メール再送' },
  
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
  
  // 行ごとにrouter + verifyCsrfTokenの組み合わせを検索
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // この行にrouterメソッドとverifyCsrfTokenが含まれているかチェック
    if (line.includes('verifyCsrfToken')) {
      // 同じ行またはその前の行でrouterメソッドを探す
      for (let j = Math.max(0, i - 2); j <= i; j++) {
        const checkLine = lines[j];
        const routerMatch = checkLine.match(/router\.(post|put|delete|patch)\s*\(\s*[`'"]([^'"]+)['"]/);
        if (routerMatch) {
          const method = routerMatch[1].toUpperCase();
          const path = routerMatch[2];
          protectedEndpoints.add(`${method} ${path}`);
          break;
        }
      }
    }
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
      
      // 特別なルートマッチング
      if (epPath === '/:param' && keyPath === '/api/v1/admin/characters/:param') {
        return true;
      }
      
      // 認証ルートの場合、/auth/プレフィックスを考慮
      if (keyPath.includes('/api/v1/auth/')) {
        // /auth/ルートの場合
        if (epPath.startsWith('/')) {
          const authPath = '/api/v1/auth' + epPath;
          if (authPath === keyPath) {
            return true;
          }
        }
        // プレフィックスなしの場合（例: /logout -> /api/v1/auth/logout）
        if (!epPath.startsWith('/api/')) {
          const authPath = '/api/v1/auth/' + epPath.replace(/^\//, '');
          if (authPath === keyPath) {
            return true;
          }
        }
      }
      
      // adminCharactersルートの場合、プレフィックスを考慮
      if (keyPath.includes('/api/v1/admin/characters/') && epPath.startsWith('/:')) {
        const adminCharPath = '/api/v1/admin/characters' + epPath;
        if (adminCharPath === keyPath) {
          return true;
        }
      }
      
      // 直接的な完全一致
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