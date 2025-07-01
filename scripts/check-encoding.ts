#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import * as path from 'path';

// git diff でステージングされたファイルを取得
const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(file => file.length > 0);

const targetExtensions = ['.ts', '.tsx', '.js', '.jsx', '.md', '.yml', '.yaml', '.json'];
let hasError = false;

for (const file of stagedFiles) {
  const ext = path.extname(file);
  
  if (!targetExtensions.includes(ext)) {
    continue;
  }

  // ファイルが存在しない場合はスキップ（削除されたファイル）
  if (!existsSync(file)) {
    continue;
  }

  try {
    // ファイルのエンコーディングをチェック
    const fileCommand = `file -bi "${file}"`;
    const fileInfo = execSync(fileCommand, { encoding: 'utf-8' }).trim();
    
    if (!fileInfo.includes('utf-8') && !fileInfo.includes('us-ascii')) {
      console.error(`❌ ${file} is not UTF-8 encoded (detected: ${fileInfo})`);
      hasError = true;
    }

    // BOMチェック
    const buffer = readFileSync(file);
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      console.error(`❌ ${file} has UTF-8 BOM`);
      hasError = true;
    }

    // 日本語が含まれるファイルで不正な文字をチェック
    const content = buffer.toString('utf-8');
    if (/[\u0080-\u009F]/.test(content)) {
      console.error(`❌ ${file} contains control characters that may indicate encoding issues`);
      hasError = true;
    }
  } catch (error) {
    console.error(`⚠️  Could not check ${file}: ${error.message}`);
  }
}

if (hasError) {
  console.error('\n🚫 Encoding issues detected. Please fix the files before committing.');
  process.exit(1);
} else if (stagedFiles.length > 0) {
  console.log('✅ All staged files have valid UTF-8 encoding');
}