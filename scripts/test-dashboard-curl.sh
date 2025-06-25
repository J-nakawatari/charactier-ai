#!/bin/bash

# Test Dashboard API with curl

# Configuration
BASE_URL="http://localhost:5000"
EMAIL="test@example.com"  # Replace with your test email
PASSWORD="password123"    # Replace with your test password

echo "=== Testing Dashboard API ==="
echo ""

# Step 1: Login to get token
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${EMAIL}\", \"password\": \"${PASSWORD}\"}")

# Extract token using grep and sed
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "✗ Login failed. Response:"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✓ Login successful"
echo "✓ Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Test debug endpoint
echo "2. Testing debug/user-affinities endpoint..."
DEBUG_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/v1/debug/user-affinities" \
  -H "Authorization: Bearer ${TOKEN}")

echo "Debug endpoint response:"
echo "$DEBUG_RESPONSE" | jq '.' 2>/dev/null || echo "$DEBUG_RESPONSE"
echo ""

# Step 3: Test dashboard endpoint
echo "3. Testing user/dashboard endpoint..."
DASHBOARD_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/v1/user/dashboard" \
  -H "Authorization: Bearer ${TOKEN}")

echo "Dashboard endpoint response (affinities only):"
echo "$DASHBOARD_RESPONSE" | jq '.affinities' 2>/dev/null || echo "$DASHBOARD_RESPONSE"
echo ""

# Step 4: Check if affinities are populated
echo "4. Checking affinities data..."
AFFINITIES_COUNT=$(echo "$DASHBOARD_RESPONSE" | jq '.affinities | length' 2>/dev/null || echo "0")
echo "Affinities count: $AFFINITIES_COUNT"

if [ "$AFFINITIES_COUNT" != "0" ] && [ "$AFFINITIES_COUNT" != "null" ]; then
  echo "First affinity:"
  echo "$DASHBOARD_RESPONSE" | jq '.affinities[0]' 2>/dev/null
fi