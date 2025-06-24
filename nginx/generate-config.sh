#!/bin/bash

# Nginx Configuration Generator Script
# This script generates nginx configuration with environment variables

# Load environment variables
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
fi

# Default to v1 if not set
export API_VERSION=${API_VERSION:-v1}

echo "🔧 Generating Nginx configuration..."
echo "📌 API Version: $API_VERSION"

# Generate configuration
envsubst '${API_VERSION}' < charactier-ai.conf.template > charactier-ai.conf

echo "✅ Nginx configuration generated: charactier-ai.conf"
echo ""
echo "📋 Next steps:"
echo "1. Review the generated configuration"
echo "2. Copy to nginx sites-available:"
echo "   sudo cp charactier-ai.conf /etc/nginx/sites-available/"
echo "3. Test configuration:"
echo "   sudo nginx -t"
echo "4. Reload nginx:"
echo "   sudo systemctl reload nginx"