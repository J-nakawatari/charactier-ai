# Rate Limiting Audit Report

## Summary
Found several routes in the backend that have missing or incorrectly ordered rate limiting middleware.

## Critical Issues

### 1. Routes with authenticateToken BEFORE rate limiting (Security Risk)
This is a security vulnerability because unauthenticated requests can bypass rate limiting by failing authentication first.

**File: `/backend/src/routes/auth.ts`**
- Line 567-569: `router.put('/user/profile', authenticateToken, generalRateLimit, ...)`
  - **Issue**: authenticateToken comes before generalRateLimit
  - **Fix**: Should be `router.put('/user/profile', generalRateLimit, authenticateToken, ...)`

### 2. Routes completely MISSING rate limiting

**File: `/backend/src/routes/auth.ts`**
- Line 1026: `router.post('/create-admin', async (req: Request, res: Response): Promise<void> => {`
  - **Issue**: No rate limiting at all
  - **Risk**: High - allows unlimited admin creation attempts
  
- Line 1073: `router.post('/admin/refresh', async (req: Request, res: Response): Promise<void> => {`
  - **Issue**: No rate limiting at all
  - **Risk**: High - allows unlimited token refresh attempts

## Pattern Analysis

### Routes that appear to have rate limiting but might need review:
These routes have rate limiting in the parameter list, but the pattern suggests they might have issues with middleware ordering:

1. **adminCharacters.ts**
   - Line 303: `router.patch('/:id/toggle-active', adminRateLimit, authenticateToken, ...)`
   - Line 420: `router.put('/:id', adminRateLimit, authenticateToken, ...)`

2. **adminNotifications.ts**
   - Line 337: `router.put('/:id', adminRateLimit, authenticateToken, ...)`
   - Line 425: `router.delete('/:id', adminRateLimit, authenticateToken, ...)`

3. **adminSecurity.ts**
   - Line 273: `router.delete('/violations/clear', securityRateLimit, authenticateToken, ...)`

4. **adminTokenPacks.ts**
   - Line 158: `router.put('/:id', adminRateLimit, authenticateToken, ...)`
   - Line 200: `router.delete('/:id', adminRateLimit, authenticateToken, ...)`

5. **adminUsers.ts**
   - Line 187: `router.put('/:userId/status', adminRateLimit, authenticateToken, ...)`

6. **characters.ts**
   - Line 326: `router.put('/:id/translations', adminRateLimit, authenticateToken, ...)`
   - Line 530: `router.delete('/:id', adminRateLimit, authenticateToken, ...)`

7. **notifications.ts**
   - Line 550: `router.put('/admin/:id', adminRateLimit, authenticateToken, ...)`
   - Line 598: `router.delete('/admin/:id', adminRateLimit, authenticateToken, ...)`

8. **systemSettings.ts**
   - Line 87: `router.delete('/google-analytics', adminRateLimit, authenticateToken, ...)`

## Recommendations

1. **Immediate Action Required**:
   - Fix the middleware ordering in `/user/profile` route
   - Add rate limiting to `/create-admin` route
   - Add rate limiting to `/admin/refresh` route

2. **Best Practice**:
   - Always place rate limiting middleware BEFORE authentication middleware
   - This ensures that even unauthenticated requests count against rate limits
   - Correct order: `router.method(path, rateLimiter, authenticateToken, ...otherMiddleware, handler)`

3. **Suggested Rate Limits**:
   - `/create-admin`: Should use strictest rate limit (e.g., 1 request per hour)
   - `/admin/refresh`: Should use authRateLimit
   - `/user/profile`: Already has generalRateLimit, just needs reordering

## Example Fix

```typescript
// Before (WRONG):
router.put('/user/profile', 
  authenticateToken,  // This runs first, bypassing rate limit on auth failure
  generalRateLimit,   // This only runs if authentication succeeds
  ...
)

// After (CORRECT):
router.put('/user/profile', 
  generalRateLimit,   // This runs first, counting all requests
  authenticateToken,  // This runs second
  ...
)
```