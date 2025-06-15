/** /var/www/charactier-ai/ecosystem.config.cjs */
module.exports = {
  apps: [
    /* ---------- Frontend (Next.js) ---------- */
    {
      name: 'charactier-frontend',
      cwd: '/var/www/charactier-ai/frontend',
      script: './node_modules/.bin/next',   // ← npm 経由より確実
      args: 'start -p 3000',
      exec_mode: 'fork',                    // 1 プロセスで十分
      instances: 1,
      env: { NODE_ENV: 'production' }
    },

    /* ---------- Backend (Express) ---------- */
    {
      name: 'charactier-backend',
      cwd: '/var/www/charactier-ai/backend',
      script: 'dist/src/index-new.js',
      exec_mode: 'fork',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 5000 }
    }
  ]
};
