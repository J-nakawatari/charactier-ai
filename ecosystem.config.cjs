/** /var/www/charactier-ai/ecosystem.config.cjs */
module.exports = {
  apps: [
    /* ---------- Frontend (Next.js) ---------- */
    {
      name: 'charactier-frontend',
      cwd: '/var/www/charactier-ai/frontend',

      // ── ❶ bash でラッパースクリプトを実行 ──
      script: './node_modules/.bin/next',
      args:   'start -p 3000',

      interpreter: 'bash',        //  ←★ ここがポイント
      exec_mode  : 'fork',
      instances  : 1,
      env: { NODE_ENV: 'production' }
    },

    /* ---------- Backend (Express) ---------- */
    {
      name: 'charactier-backend',
      cwd : '/var/www/charactier-ai/backend',
      script: 'dist/src/index.js',
      exec_mode: 'fork',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 5000 }
    }
  ]
};
