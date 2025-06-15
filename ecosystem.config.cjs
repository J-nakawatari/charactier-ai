// ecosystem.config.cjs
module.exports = {
  apps: [
    /* ────────────── Frontend (Next.js) ────────────── */
    {
      name: 'charactier-frontend',
      cwd: '/var/www/charactier-ai/frontend',          // ← 絶対パスで固定
      script: 'node_modules/.bin/next',                // ← npm を介さず直接
      args: 'start -p 3000',                           // ← ポートを明示
      instances: 1,                                    // ← 1 で競合回避
      interpreter: 'node',                             // （デフォルト）
      env: {
        NODE_ENV: 'production'
      }
    },

    /* ─────────────── Backend (Express) ─────────────── */
    {
      name: 'charactier-backend',
      cwd: '/var/www/charactier-ai/backend',
      script: '/var/www/charactier-ai/backend/dist/src/index-new.js',
      instances: 1,
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
