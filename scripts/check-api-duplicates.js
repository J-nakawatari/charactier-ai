#!/usr/bin/env node
/**
 * API重複検出スクリプト
 * 使用方法: node scripts/check-api-duplicates.js
 */

const fs = require('fs');
const path = require('path');

function findAPIRoutes(filePath, content) {
  const routes = [];
  const fileName = path.basename(filePath);
  
  // app.use()でマウントされるルート
  const useMatches = content.match(/app\.use\(['"`]([^'"`]+)['"`],\s*(\w+)\)/g);
  if (useMatches) {
    useMatches.forEach(match => {
      const [, routePath, routerName] = match.match(/app\.use\(['"`]([^'"`]+)['"`],\s*(\w+)\)/);
      routes.push({
        type: 'use',
        path: routePath,
        method: 'ALL',
        file: fileName,
        router: routerName
      });
    });
  }
  
  // 直接定義されるルート
  const directMatches = content.match(/app\.(get|post|put|delete)\(['"`]([^'"`]+)['"`]/g);
  if (directMatches) {
    directMatches.forEach(match => {
      const [, method, routePath] = match.match(/app\.(get|post|put|delete)\(['"`]([^'"`]+)['"`]/);
      routes.push({
        type: 'direct',
        path: routePath,
        method: method.toUpperCase(),
        file: fileName
      });
    });
  }
  
  return routes;
}

function checkDuplicates() {
  const backendPath = path.join(__dirname, '../backend');
  const indexFile = path.join(backendPath, 'src/index.ts');
  
  if (!fs.existsSync(indexFile)) {
    console.error('❌ index.ts not found');
    return;
  }
  
  const indexContent = fs.readFileSync(indexFile, 'utf8');
  const routes = findAPIRoutes(indexFile, indexContent);
  
  // パス別にグループ化
  const pathGroups = {};
  routes.forEach(route => {
    if (!pathGroups[route.path]) {
      pathGroups[route.path] = [];
    }
    pathGroups[route.path].push(route);
  });
  
  // 重複チェック（同じHTTPメソッドのみ）
  const duplicates = Object.entries(pathGroups)
    .filter(([path, routes]) => {
      if (!path.startsWith('/api')) return false;
      
      // 同じHTTPメソッドでグループ化
      const methodGroups = {};
      routes.forEach(route => {
        if (!methodGroups[route.method]) {
          methodGroups[route.method] = [];
        }
        methodGroups[route.method].push(route);
      });
      
      // 同じメソッドで複数の実装があるかチェック
      return Object.values(methodGroups).some(group => group.length > 1);
    })
    .map(([path, routes]) => {
      // 実際に重複しているルートのみを返す
      const methodGroups = {};
      routes.forEach(route => {
        if (!methodGroups[route.method]) {
          methodGroups[route.method] = [];
        }
        methodGroups[route.method].push(route);
      });
      
      const duplicatedRoutes = [];
      Object.values(methodGroups).forEach(group => {
        if (group.length > 1) {
          duplicatedRoutes.push(...group);
        }
      });
      
      return [path, duplicatedRoutes];
    })
    .filter(([path, routes]) => routes.length > 0);
  
  if (duplicates.length === 0) {
    console.log('✅ 重複するAPIエンドポイントは見つかりませんでした');
    return;
  }
  
  console.log('🔴 重複するAPIエンドポイントが見つかりました：\n');
  
  duplicates.forEach(([path, routes]) => {
    console.log(`📍 ${path}`);
    routes.forEach(route => {
      const info = route.type === 'use' 
        ? `  - ${route.method} (${route.file}) -> ${route.router}`
        : `  - ${route.method} (${route.file}) -> 直接定義`;
      console.log(info);
    });
    console.log('');
  });
  
  process.exit(1);
}

checkDuplicates();