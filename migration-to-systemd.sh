#!/bin/bash

# Migration script from PM2 to systemd
# This script should be run on the production server

echo "🚀 Starting migration from PM2 to systemd..."

# Step 1: Copy service files
echo "📋 Step 1: Installing systemd service files..."
sudo cp charactier-backend.service /etc/systemd/system/
sudo cp /var/www/charactier-ai/frontend/charactier-frontend.service /etc/systemd/system/

# Step 2: Reload systemd daemon
echo "🔄 Step 2: Reloading systemd daemon..."
sudo systemctl daemon-reload

# Step 3: Enable services
echo "⚙️  Step 3: Enabling services..."
sudo systemctl enable charactier-backend
sudo systemctl enable charactier-frontend

# Step 4: Stop PM2 processes
echo "🛑 Step 4: Stopping PM2 processes..."
pm2 stop charactier-backend
pm2 stop charactier-frontend

# Step 5: Start systemd services
echo "▶️  Step 5: Starting systemd services..."
sudo systemctl start charactier-backend
sudo systemctl start charactier-frontend

# Step 6: Check status
echo "✅ Step 6: Checking service status..."
sudo systemctl status charactier-backend --no-pager
sudo systemctl status charactier-frontend --no-pager

# Step 7: Remove from PM2
echo "🗑️  Step 7: Removing from PM2..."
pm2 delete charactier-backend
pm2 delete charactier-frontend
pm2 save

# Step 8: Update git hook
echo "📝 Step 8: Updating git post-merge hook..."
cat > /var/www/charactier-ai/.git/hooks/post-merge << 'EOF'
#!/bin/bash
echo "🔄 Building frontend and backend..."
cd /var/www/charactier-ai

# Frontend build
cd frontend && npm run build

# Backend build
cd ../backend && npm run build

# Restart services
echo "🔄 Restarting services..."
sudo systemctl restart charactier-backend
sudo systemctl restart charactier-frontend

echo "✅ Deploy completed!"
EOF

chmod +x /var/www/charactier-ai/.git/hooks/post-merge

echo "🎉 Migration completed!"
echo ""
echo "📌 Useful commands:"
echo "  - Check logs: sudo journalctl -u charactier-backend -f"
echo "  - Restart: sudo systemctl restart charactier-backend charactier-frontend"
echo "  - Status: sudo systemctl status charactier-backend charactier-frontend"