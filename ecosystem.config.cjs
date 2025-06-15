module.exports = {
  apps: [
    {
      name: 'charactier-frontend',
      cwd: '/var/www/charactier-ai/frontend',   // フロント本体のパスを統一
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',                    // ← ポートをはっきり指定
      instances: 1,                            // ← ここが 2 以上だと競合します
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'charactier-backend',
      cwd: '/var/www/charactier-ai/backend',
      script: 'dist/src/index-new.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
}
