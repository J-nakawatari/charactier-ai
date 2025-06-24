#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// 対象ファイルのパターン
const filePatterns = [
  'app/**/*.tsx',
  'app/**/*.ts',
  'components/**/*.tsx',
  'components/**/*.ts',
  'hooks/**/*.ts',
  'utils/**/*.ts',
];

// 置換パターン - '/api/v1' を環境変数ベースに変更
const replacements = [
  // fetch パターン
  { from: /fetch\(['"]\/api\/v1\//g, to: 'fetch(`/api/${process.env.NEXT_PUBLIC_API_VERSION || \'v1\'}/' },
  { from: /fetch\(`\/api\/v1\//g, to: 'fetch(`/api/${process.env.NEXT_PUBLIC_API_VERSION || \'v1\'}/' },
  
  // authenticatedFetch パターン
  { from: /authenticatedFetch\(['"]\/api\/v1\//g, to: 'authenticatedFetch(`/api/${process.env.NEXT_PUBLIC_API_VERSION || \'v1\'}/' },
  { from: /authenticatedFetch\(`\/api\/v1\//g, to: 'authenticatedFetch(`/api/${process.env.NEXT_PUBLIC_API_VERSION || \'v1\'}/' },
  
  // adminFetch パターン
  { from: /adminFetch\(['"]\/api\/v1\//g, to: 'adminFetch(`/api/${process.env.NEXT_PUBLIC_API_VERSION || \'v1\'}/' },
  { from: /adminFetch\(`\/api\/v1\//g, to: 'adminFetch(`/api/${process.env.NEXT_PUBLIC_API_VERSION || \'v1\'}/' },
  
  // adminAuthenticatedFetch パターン
  { from: /adminAuthenticatedFetch\(['"]\/api\/v1\//g, to: 'adminAuthenticatedFetch(`/api/${process.env.NEXT_PUBLIC_API_VERSION || \'v1\'}/' },
  { from: /adminAuthenticatedFetch\(`\/api\/v1\//g, to: 'adminAuthenticatedFetch(`/api/${process.env.NEXT_PUBLIC_API_VERSION || \'v1\'}/' },
  
  // EventSource パターン  
  { from: /new EventSource\(['"]\/api\/v1\//g, to: 'new EventSource(`/api/${process.env.NEXT_PUBLIC_API_VERSION || \'v1\'}/' },
  { from: /new EventSource\(`\/api\/v1\//g, to: 'new EventSource(`/api/${process.env.NEXT_PUBLIC_API_VERSION || \'v1\'}/' },
];

// ヘルパー関数を追加するためのコード
const helperCode = `
// API Version Helper
const getApiPath = (path: string) => {
  const apiVersion = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
  return \`/api/\${apiVersion}\${path}\`;
};
`;

let totalFiles = 0;
let totalReplacements = 0;

// 各ファイルパターンに対して処理
filePatterns.forEach(pattern => {
  const files = glob.sync(pattern, { cwd: process.cwd() });
  
  files.forEach((filePath: string) => {
    let content = fs.readFileSync(filePath, 'utf-8');
    let fileChanged = false;
    let fileReplacements = 0;
    
    replacements.forEach(({ from, to }) => {
      const matches = content.match(from);
      if (matches && matches.length > 0) {
        content = content.replace(from, to);
        fileChanged = true;
        fileReplacements += matches.length;
        totalReplacements += matches.length;
      }
    });
    
    if (fileChanged) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated ${filePath} (${fileReplacements} replacements)`);
      totalFiles++;
    }
  });
});

console.log(`
✅ Migration to env-based API version completed!
📊 Summary:
  - Total files updated: ${totalFiles}
  - Total replacements: ${totalReplacements}
  
⚠️  Please review the changes and test thoroughly before deploying.
`);