module.exports = {
  apps: [
    {
      name: 'charactier-backend',
      script: 'dist/src/index.js',      // ビルド済JS
      cwd: '/var/www/charactier-ai/backend',
      instances: 1,                     // 必要ならcluster_mode
      exec_mode: 'fork',
      env_file: '.env',                 // cwdからの相対パスでOK
      env: {                            // ここに直書きでも可
        NODE_ENV: 'production'
      },
      // 任意: 自動リスタートなど
      watch: false,
      autorestart: true,
      max_memory_restart: '1G',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true
    }
  ]
};