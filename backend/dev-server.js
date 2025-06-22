// Development server wrapper
// This bypasses the complex TypeScript/JavaScript import issues
const { spawn } = require('child_process');
const path = require('path');

// Set environment variables for development
process.env.NODE_ENV = 'development';
process.env.PORT = process.env.PORT || '5000';

// Load .env file if it exists
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {
  console.log('⚠️ No .env file found, using environment variables');
}

console.log('🚀 Starting backend server in development mode...');
console.log(`📍 Server will run on port: ${process.env.PORT}`);
console.log(`🔧 MongoDB: ${process.env.MONGO_URI ? 'Configured' : 'Not configured'}`);
console.log(`📧 SendGrid: ${process.env.SENDGRID_API_KEY ? 'Configured' : 'Not configured'}`);

// Run the TypeScript server directly
const server = spawn('npx', ['ts-node', 'src/index.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: process.env
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

// Handle termination
process.on('SIGINT', () => {
  console.log('\n⏹️ Stopping server...');
  server.kill('SIGINT');
});