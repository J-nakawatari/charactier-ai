# CodeQL Breaking Changes Analysis for Charactier AI

This document analyzes potential CodeQL security warnings that would require breaking changes to fix. These changes would affect existing client behavior and require coordinated frontend/backend updates.

## 1. XSS Vulnerabilities Requiring Strict HTML Sanitization

### Current Issue: Unsafe HTML Generation in Email Verification
**Location**: `/backend/src/routes/auth.ts` (lines 79-101)
```javascript
const successScript = type === 'success' && userData ? `
  <script>
    // ユーザー情報とトークンをlocalStorageに保存
    (function() {
      try {
        // ユーザー情報を保存
        localStorage.setItem('user', JSON.stringify(${JSON.stringify(userData.userInfo)}));
        localStorage.setItem('accessToken', '${userData.accessToken}');
        localStorage.setItem('refreshToken', '${userData.refreshToken}');
      } catch (error) {
        // Failed to save user data
      }
    })();
    
    // 3秒後にリダイレクト
    window.onload = function() {
      setTimeout(function() {
        window.location.href = '${frontendUrl}/${locale}/setup';
      }, 3000);
    };
  </script>
` : '';
```

**CodeQL Warning**: CWE-79 - Reflected XSS via template interpolation
**Risk**: User data is directly interpolated into JavaScript without proper encoding
**Breaking Change Required**: 
- Would need to change from inline script to data attributes or API calls
- Frontend would need to handle authentication differently
- Email verification flow would need complete redesign

### Current Issue: Weak HTML Sanitization
**Location**: `/backend/src/middleware/validation.ts` (lines 151-161)
```javascript
export function sanitizeHtml(input: string): string {
  if (!input) return input;
  
  // 基本的なHTMLタグとスクリプトを除去
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}
```

**CodeQL Warning**: CWE-79 - Insufficient HTML sanitization
**Risk**: Regex-based sanitization can be bypassed
**Breaking Change Required**:
- Need to implement DOMPurify or similar library
- May break content that relied on certain HTML entities
- Chat messages with special characters might be affected

## 2. API Response Format Inconsistencies

### Current Issue: Inconsistent Error Response Formats
**Observation**: Multiple error response patterns exist:
```javascript
// Pattern 1: Simple object
res.status(400).json({ error: 'Invalid input' });

// Pattern 2: With message
res.status(400).json({ 
  error: 'Invalid input',
  message: '無効な入力です' 
});

// Pattern 3: With ClientErrorCode
res.status(400).json({
  error: ClientErrorCode.INVALID_INPUT,
  message: safeMessage
});

// Pattern 4: HTML response for email verification
res.status(200).send(generateEmailVerificationHTML(...));
```

**CodeQL Warning**: API consistency issues
**Breaking Change Required**:
- Standardizing all error responses would break frontend error handling
- Clients expecting specific error formats would fail
- Mobile apps would need updates

## 3. Cookie Security Configuration

### Current Issue: Cookie Configuration Lacks Strict Security
**Location**: Throughout auth flows
```javascript
// Current cookie settings (inferred from CSRF protection)
cookieOptions = {
  httpOnly: false,  // Allows JavaScript access for CSRF
  sameSite: 'lax', // Not strict
  secure: process.env.NODE_ENV === 'production'
}
```

**CodeQL Warning**: CWE-614 - Sensitive Cookie Without 'Secure' Attribute
**Breaking Change Required**:
- Setting `sameSite: 'strict'` would break cross-site navigation flows
- Setting `httpOnly: true` for all cookies would break CSRF token reading
- Would require complete auth flow redesign

## 4. CORS Policy Tightening

### Current Issue: Permissive CORS in Development
**Location**: `/backend/src/index.ts` (lines 403-431)
```javascript
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? (process.env.ALLOWED_ORIGINS || 'https://charactier-ai.com,https://www.charactier-ai.com').split(',')
  : [
      'http://localhost:3000', 
      'http://localhost:3001',
      'https://charactier-ai.com',
      'https://www.charactier-ai.com'
    ];

// origin が undefined の場合は同一オリジンリクエスト（Postman等も許可）
if (!origin || allowedOrigins.includes(origin)) {
  callback(null, true);
}
```

**CodeQL Warning**: CWE-942 - Overly Permissive CORS
**Breaking Change Required**:
- Removing `!origin` check would break Postman/curl testing
- Stricter origin validation would break local development
- Would affect API testing tools

## 5. NoSQL Injection Prevention

### Current Issue: MongoDB Query Construction
**Observation**: While `$eq` is used in some places, direct query object passing exists:
```javascript
// Safe pattern (used in some places)
await UserModel.findOne({ 
  email: { $eq: email }, 
  isActive: { $ne: false } 
});

// Potentially unsafe pattern (if user input is passed)
await Model.find(req.query); // If req.query contains MongoDB operators
```

**CodeQL Warning**: CWE-943 - NoSQL Injection
**Breaking Change Required**:
- Strict input validation would reject previously valid queries
- API consumers using advanced queries would break
- Search/filter functionality might be limited

## 6. JWT Token Storage and Validation

### Current Issue: Dual Token Storage Pattern
**Location**: Frontend and Backend auth flows
- Tokens stored in both localStorage (frontend) and cookies (backend)
- Mixed authentication patterns (Bearer tokens vs cookies)

**CodeQL Warning**: CWE-522 - Insufficiently Protected Credentials
**Breaking Change Required**:
- Moving all tokens to httpOnly cookies would break:
  - Current frontend token refresh logic
  - API calls using Authorization headers
  - Mobile app authentication
- Would require complete auth system rewrite

## 7. Input Validation Strictness

### Current Issue: Permissive Validation
**Location**: `/backend/src/middleware/validation.ts`
```javascript
stripUnknown: true,  // Silently removes unknown fields
convert: true        // Auto-converts types
```

**CodeQL Warning**: CWE-20 - Improper Input Validation
**Breaking Change Required**:
- Setting `stripUnknown: false` would reject requests with extra fields
- Setting `convert: false` would reject type mismatches
- Mobile apps sending extra telemetry data would fail
- Legacy API consumers would break

## 8. Content Security Policy

### Current Issue: Missing or Weak CSP Headers
**Observation**: While security headers are configured, strict CSP would break:
- Inline scripts (email verification)
- Dynamic script loading
- Third-party integrations (Stripe, analytics)

**CodeQL Warning**: CWE-693 - Missing Security Headers
**Breaking Change Required**:
- Strict CSP would require:
  - Removing all inline scripts
  - Using nonces for necessary scripts
  - Whitelisting all external resources
- Would break current email verification flow
- Analytics and payment integrations would need reconfiguration

## Recommendations

### High Priority (Security Critical)
1. **XSS in Email Verification**: Redesign to use API-based verification instead of inline scripts
2. **Cookie Security**: Implement proper SameSite=Strict with authentication flow redesign
3. **HTML Sanitization**: Replace regex with DOMPurify

### Medium Priority (Functional Impact)
1. **API Response Standardization**: Version the API and migrate gradually
2. **CORS Tightening**: Implement environment-specific configurations
3. **Input Validation**: Add strict mode as opt-in feature

### Low Priority (Minor Breaking Changes)
1. **NoSQL Injection**: Add query sanitization middleware
2. **CSP Headers**: Implement gradually with report-only mode first

## Migration Strategy

1. **API Versioning**: Create v2 endpoints with strict security
2. **Feature Flags**: Use flags to enable strict modes gradually
3. **Deprecation Notices**: Announce changes 30 days in advance
4. **Backward Compatibility**: Maintain v1 endpoints for 6 months
5. **Client Updates**: Coordinate frontend/mobile updates before enforcing

## Estimated Impact

- **Frontend Changes**: 40+ components would need updates
- **Mobile Apps**: Complete auth flow rewrite needed
- **API Consumers**: All third-party integrations would break
- **Development Time**: 2-3 months for full migration
- **Testing Time**: 1 month comprehensive testing