#!/usr/bin/env node

// PM2用の起動スクリプト
// これにより、PM2がNode.jsスクリプトとして正しく実行できる

process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '3000';

// Next.jsのCLIを直接実行
require('next/dist/cli/next-start');