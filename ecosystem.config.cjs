// /var/www/charactier-ai/ecosystem.config.cjs
module.exports = {
  apps: [
    /* ─────────────── Frontend (Next.js) ─────────────── */
    {
      name: 'charactier-frontend',
      cwd:  '/var/www/charactier-ai/frontend',
      /* Next を直接呼び出す ― npm script 経由より確実 */
      script: 'node_modules/.bin/next',
      args:   'start -p 3000',
      /* フロントはポート競合しやすいのでまずは fork + 1 インスタンス */
      exec_mode: 'fork',
      instances: 1,
      env: { NODE_ENV: 'production' }
    },

    /* ─────────────── Backend (Express) ─────────────── */
    {
      name: 'charactier-backend',
      cwd:  '/var/www/charactier-ai/backend',
      script: 'dist/src/index-new.js',
      exec_mode: 'fork',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 5000 }
    }
  ]
};
