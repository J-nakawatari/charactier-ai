// ecosystem.config.cjs
module.exports = {
  apps: [
    /* ─────────────── Frontend ─────────────── */
    {
      name: 'charactier-frontend',
      cwd: './frontend',
      script: 'pnpm',
      args: 'start',          // ← "next start" を呼ぶ
      interpreter: 'none',    // pnpm が node を呼ぶため
      env: {
        NODE_ENV: 'production',
        PORT: 3000            // Nginx が proxy するポート
      }
    },

    /* ─────────────── Backend ─────────────── */
    {
      name: 'charactier-backend',
      cwd: './backend',
      script: 'node',
      args: 'dist/index.js',  // tsc で生成された JS エントリ
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};