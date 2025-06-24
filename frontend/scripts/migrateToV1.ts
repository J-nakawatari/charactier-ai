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

// 置換パターン
const replacements = [
  // fetch パターン
  { from: /fetch\(['"]\/api\//g, to: 'fetch(\'/api/v1/' },
  { from: /fetch\(`\/api\//g, to: 'fetch(`/api/v1/' },
  
  // authenticatedFetch パターン
  { from: /authenticatedFetch\(['"]\/api\//g, to: 'authenticatedFetch(\'/api/v1/' },
  { from: /authenticatedFetch\(`\/api\//g, to: 'authenticatedFetch(`/api/v1/' },
  
  // adminFetch パターン
  { from: /adminFetch\(['"]\/api\//g, to: 'adminFetch(\'/api/v1/' },
  { from: /adminFetch\(`\/api\//g, to: 'adminFetch(`/api/v1/' },
  
  // adminAuthenticatedFetch パターン
  { from: /adminAuthenticatedFetch\(['"]\/api\//g, to: 'adminAuthenticatedFetch(\'/api/v1/' },
  { from: /adminAuthenticatedFetch\(`\/api\//g, to: 'adminAuthenticatedFetch(`/api/v1/' },
  
  // EventSource パターン
  { from: /new EventSource\(['"]\/api\//g, to: 'new EventSource(\'/api/v1/' },
  { from: /new EventSource\(`\/api\//g, to: 'new EventSource(`/api/v1/' },
  
  // URL文字列パターン
  { from: /['"]\/api\/characters['"]/g, to: '\'/api/v1/characters\'' },
  { from: /['"]\/api\/notifications['"]/g, to: '\'/api/v1/notifications\'' },
  { from: /['"]\/api\/user['"]/g, to: '\'/api/v1/user\'' },
  { from: /['"]\/api\/auth['"]/g, to: '\'/api/v1/auth\'' },
  { from: /['"]\/api\/system-settings['"]/g, to: '\'/api/v1/system-settings\'' },
  
  // 既に/api/v1/になっているものは除外
  { from: /\/api\/v1\/v1\//g, to: '/api/v1/' }, // 二重になったものを修正
];

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
✅ Migration completed!
📊 Summary:
  - Total files updated: ${totalFiles}
  - Total replacements: ${totalReplacements}
  
⚠️  Please review the changes and test thoroughly before deploying.
`);