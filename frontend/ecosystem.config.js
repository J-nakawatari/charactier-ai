module.exports = {
  apps: [{
    name: 'charactier-frontend',
    script: 'npm',
    args: 'run start',
    cwd: '/var/www/charactier-ai/frontend',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    interpreter: '/bin/bash',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};