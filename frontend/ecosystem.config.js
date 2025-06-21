module.exports = {
  apps: [{
    name: 'charactier-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/charactier-ai/frontend',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};