#!/usr/bin/env node

// PM2用の起動スクリプト
// これにより、PM2がNode.jsスクリプトとして正しく実行できる

const { spawn } = require('child_process');
const path = require('path');

process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '3000';

// Next.jsのCLIを子プロセスとして実行
const nextPath = path.join(__dirname, 'node_modules', '.bin', 'next');
const next = spawn(nextPath, ['start'], {
  stdio: 'inherit',
  env: process.env
});

next.on('close', (code) => {
  process.exit(code);
});