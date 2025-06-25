#!/bin/bash

echo "=== Testing Dashboard API ==="

# Login
echo "1. Logging in..."
LOGIN=$(curl -s -X POST "http://localhost:5000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}')

TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "Login failed. Try with your credentials:"
  echo "Response: $LOGIN"
  exit 1
fi

echo "Token: ${TOKEN:0:30}..."

# Test debug endpoint
echo ""
echo "2. Debug endpoint:"
curl -s "http://localhost:5000/api/v1/debug/user-affinities" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Test dashboard endpoint
echo ""
echo "3. Dashboard endpoint (affinities):"
curl -s "http://localhost:5000/api/v1/user/dashboard" \
  -H "Authorization: Bearer $TOKEN" | jq '.affinities'