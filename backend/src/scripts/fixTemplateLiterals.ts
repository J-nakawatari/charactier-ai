#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

const indexPath = path.join(__dirname, '../index.ts');
let content = fs.readFileSync(indexPath, 'utf-8');

// 誤ったテンプレートリテラルのパターンを修正
// `${API_PREFIX}/xxx' → `${API_PREFIX}/xxx`
const pattern = /`(\${API_PREFIX}[^`]*?)'/g;
content = content.replace(pattern, '`$1`');

// バックアップを作成
fs.writeFileSync(indexPath + '.backup2', content);

// ファイルに書き込む
fs.writeFileSync(indexPath, content);

console.log('✅ Template literals fixed successfully!');