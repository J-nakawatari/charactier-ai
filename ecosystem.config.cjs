module.exports = {
  apps: [
    {
      name: 'charactier-backend',
      cwd: './backend',
      script: 'npm',
      args: 'run start',
      env: { NODE_ENV: 'production', PORT: 5000 }
    },
    {
      name: 'charactier-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run start',
      env: { NODE_ENV: 'production', PORT: 3000 }
    }
  ]
};