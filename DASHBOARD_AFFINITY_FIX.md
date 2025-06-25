# Dashboard Affinities Fix Summary

## Problem
The `/api/v1/user/dashboard` endpoint was returning an empty `affinities` array even though the debug endpoint `/api/v1/debug/user-affinities` showed the affinities data correctly.

## Root Cause
The dashboard endpoint was missing the populate directive for `affinities.character`. It was only populating `purchasedCharacters` but not the character references within the affinities array.

## Solution
Added the missing populate directive in `backend/src/index.ts` at line 1022:

```typescript
// Before (line 1020-1021):
const userDoc = await UserModel.findById(userId)
  .populate('purchasedCharacters', '_id name');

// After (line 1020-1022):
const userDoc = await UserModel.findById(userId)
  .populate('purchasedCharacters', '_id name')
  .populate('affinities.character', '_id name imageCharacterSelect themeColor');
```

## What This Fix Does
1. Populates the character data within each affinity object
2. Includes character name, image, and theme color
3. Ensures the frontend receives fully populated affinity data instead of just character IDs

## Testing the Fix

### 1. Restart the Backend
```bash
sudo systemctl restart charactier-backend
# OR for development:
cd backend && npm run dev
```

### 2. Test with curl
```bash
# Login (replace with your actual credentials)
TOKEN=$(curl -s -X POST "http://localhost:5000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com", "password": "your-password"}' \
  | grep -o '"token":"[^"]*' | sed 's/"token":"//')

# Get dashboard data
curl -s "http://localhost:5000/api/v1/user/dashboard" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.affinities'
```

### 3. Expected Result
The affinities array should now contain fully populated character objects:
```json
{
  "affinities": [
    {
      "character": {
        "_id": "...",
        "name": { "ja": "キャラ名", "en": "Character Name" },
        "imageCharacterSelect": "/uploads/characters/...",
        "themeColor": "#8B5CF6"
      },
      "level": 5,
      "experience": 50,
      "experienceToNext": 50,
      "maxExperience": 100,
      "unlockedImages": [],
      "nextUnlockLevel": 10
    }
  ]
}
```

## Files Modified
- `/backend/src/index.ts` - Added populate for affinities.character in dashboard endpoint (line 1022)

## Test Scripts Created
- `/scripts/test-dashboard-simple.js` - Simple Node.js test for the dashboard API
- `/scripts/test-dashboard-curl.sh` - Bash script using curl
- `/scripts/test-affinity-populate.js` - Direct database test for populate functionality

## Next Steps
1. Deploy the fix to production
2. Verify that the frontend PurchaseHistorySummary component now shows affinity data correctly
3. Monitor for any performance impact (populate adds a database join)