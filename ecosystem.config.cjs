module.exports = {
  apps: [
    {
      name: 'charactier-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'charactier-backend',
      cwd: './backend',
      script: 'dist/src/index-new.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
}
