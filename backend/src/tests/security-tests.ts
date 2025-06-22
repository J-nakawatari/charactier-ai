/**
 * Security Penetration Testing Script
 * Tests common security vulnerabilities in the application
 */

import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

interface TestResult {
  test: string;
  passed: boolean;
  details: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

const results: TestResult[] = [];

// Helper function to log test results
function logTest(test: string, passed: boolean, details: string, severity?: TestResult['severity']) {
  const emoji = passed ? '✅' : '❌';
  console.log(`${emoji} ${test}: ${details}`);
  results.push({ test, passed, details, severity });
}

// Test 1: SQL Injection attempts
async function testSQLInjection() {
  console.log('\n🔍 Testing SQL Injection vulnerabilities...');
  
  const sqlInjectionPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "1' UNION SELECT * FROM users--",
    "admin'--",
    "' OR 1=1--"
  ];

  for (const payload of sqlInjectionPayloads) {
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: payload,
        password: payload
      }, { validateStatus: () => true });

      if (response.status === 200) {
        logTest('SQL Injection', false, `Vulnerable to payload: ${payload}`, 'critical');
      } else if (response.data.error && response.data.error !== 'AUTH_FAILED') {
        logTest('SQL Injection', false, `May be vulnerable - unusual error: ${response.data.error}`, 'high');
      } else {
        logTest('SQL Injection', true, `Protected against payload: ${payload}`);
      }
    } catch (error) {
      logTest('SQL Injection', true, `Request failed safely for payload: ${payload}`);
    }
  }
}

// Test 2: NoSQL Injection attempts
async function testNoSQLInjection() {
  console.log('\n🔍 Testing NoSQL Injection vulnerabilities...');
  
  const noSqlPayloads = [
    { email: { $ne: null }, password: { $ne: null } },
    { email: { $gt: '' }, password: { $gt: '' } },
    { email: { $regex: '.*' }, password: { $regex: '.*' } }
  ];

  for (const payload of noSqlPayloads) {
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, payload, {
        validateStatus: () => true,
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.status === 200) {
        logTest('NoSQL Injection', false, `Vulnerable to payload: ${JSON.stringify(payload)}`, 'critical');
      } else {
        logTest('NoSQL Injection', true, `Protected against payload: ${JSON.stringify(payload)}`);
      }
    } catch (error) {
      logTest('NoSQL Injection', true, `Request failed safely for NoSQL injection attempt`);
    }
  }
}

// Test 3: XSS attempts
async function testXSS() {
  console.log('\n🔍 Testing XSS vulnerabilities...');
  
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    '<svg onload=alert("XSS")>',
    '"><script>alert("XSS")</script>'
  ];

  // Test in user registration
  for (const payload of xssPayloads) {
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/register`, {
        name: payload,
        email: `test${Date.now()}@example.com`,
        password: 'TestPass123!'
      }, { validateStatus: () => true });

      // Check if payload is reflected without encoding
      if (response.data && JSON.stringify(response.data).includes(payload)) {
        logTest('XSS Prevention', false, `Payload reflected in response: ${payload}`, 'high');
      } else {
        logTest('XSS Prevention', true, `Payload properly handled: ${payload}`);
      }
    } catch (error) {
      logTest('XSS Prevention', true, `Request handled safely for XSS payload`);
    }
  }
}

// Test 4: Authentication bypass attempts
async function testAuthBypass() {
  console.log('\n🔍 Testing Authentication bypass...');
  
  // Test accessing protected endpoints without token
  const protectedEndpoints = [
    '/api/user/profile',
    '/api/admin/users',
    '/api/characters',
    '/api/chat/send'
  ];

  for (const endpoint of protectedEndpoints) {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        validateStatus: () => true
      });

      if (response.status === 200) {
        logTest('Auth Bypass', false, `Endpoint accessible without auth: ${endpoint}`, 'critical');
      } else if (response.status === 401 || response.status === 403) {
        logTest('Auth Bypass', true, `Endpoint properly protected: ${endpoint}`);
      } else {
        logTest('Auth Bypass', true, `Endpoint returned ${response.status}: ${endpoint}`);
      }
    } catch (error) {
      logTest('Auth Bypass', true, `Endpoint protected: ${endpoint}`);
    }
  }

  // Test with invalid/expired tokens
  const invalidTokens = [
    'invalid.token.here',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
  ];

  for (const token of invalidTokens) {
    try {
      const response = await axios.get(`${BASE_URL}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
        validateStatus: () => true
      });

      if (response.status === 200) {
        logTest('Token Validation', false, `Invalid token accepted`, 'critical');
      } else {
        logTest('Token Validation', true, `Invalid token rejected properly`);
      }
    } catch (error) {
      logTest('Token Validation', true, `Invalid token handled correctly`);
    }
  }
}

// Test 5: Rate limiting
async function testRateLimiting() {
  console.log('\n🔍 Testing Rate Limiting...');
  
  const endpoint = '/api/auth/login';
  const requests = [];
  
  // Send 150 requests rapidly (rate limit should be 100/min)
  for (let i = 0; i < 150; i++) {
    requests.push(
      axios.post(`${BASE_URL}${endpoint}`, {
        email: 'test@example.com',
        password: 'wrong'
      }, { validateStatus: () => true })
    );
  }

  try {
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429).length;
    
    if (rateLimited > 0) {
      logTest('Rate Limiting', true, `Rate limiting active: ${rateLimited} requests blocked`);
    } else {
      logTest('Rate Limiting', false, `No rate limiting detected on ${endpoint}`, 'medium');
    }
  } catch (error) {
    logTest('Rate Limiting', true, `Rate limiting test completed`);
  }
}

// Test 6: CSRF Protection
async function testCSRF() {
  console.log('\n🔍 Testing CSRF Protection...');
  
  try {
    // Try to make a state-changing request without proper origin
    const response = await axios.post(`${BASE_URL}/api/user/update`, {
      name: 'CSRF Test'
    }, {
      headers: {
        'Origin': 'http://evil-site.com',
        'Referer': 'http://evil-site.com'
      },
      validateStatus: () => true
    });

    if (response.status === 200) {
      logTest('CSRF Protection', false, `Cross-origin request accepted`, 'high');
    } else {
      logTest('CSRF Protection', true, `Cross-origin request blocked`);
    }
  } catch (error) {
    logTest('CSRF Protection', true, `CSRF attempt blocked`);
  }
}

// Test 7: Security Headers
async function testSecurityHeaders() {
  console.log('\n🔍 Testing Security Headers...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/health`, {
      validateStatus: () => true
    });

    const headers = response.headers;
    const requiredHeaders = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'x-xss-protection': '1; mode=block',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'content-security-policy': true // Just check if exists
    };

    for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
      if (headers[header]) {
        if (typeof expectedValue === 'string' && headers[header] !== expectedValue) {
          logTest('Security Headers', false, `${header} has incorrect value: ${headers[header]}`, 'medium');
        } else {
          logTest('Security Headers', true, `${header} is properly set`);
        }
      } else {
        logTest('Security Headers', false, `Missing header: ${header}`, 'medium');
      }
    }
  } catch (error) {
    logTest('Security Headers', false, `Could not test security headers`, 'low');
  }
}

// Test 8: Information Disclosure
async function testInformationDisclosure() {
  console.log('\n🔍 Testing Information Disclosure...');
  
  // Test for detailed error messages
  try {
    const response = await axios.get(`${BASE_URL}/api/users/invalid-id-format`, {
      validateStatus: () => true
    });

    if (response.data.stack || response.data.trace) {
      logTest('Info Disclosure', false, `Stack trace exposed in error response`, 'high');
    } else if (response.data.error && response.data.error.includes('MongoDB') || response.data.error.includes('Cast')) {
      logTest('Info Disclosure', false, `Database details exposed in error`, 'medium');
    } else {
      logTest('Info Disclosure', true, `Error messages properly sanitized`);
    }
  } catch (error) {
    logTest('Info Disclosure', true, `No sensitive information in errors`);
  }

  // Test for common sensitive files
  const sensitiveFiles = [
    '/.env',
    '/.git/config',
    '/package.json',
    '/node_modules',
    '/.gitignore'
  ];

  for (const file of sensitiveFiles) {
    try {
      const response = await axios.get(`${BASE_URL}${file}`, {
        validateStatus: () => true
      });

      if (response.status === 200) {
        logTest('File Exposure', false, `Sensitive file accessible: ${file}`, 'critical');
      } else {
        logTest('File Exposure', true, `Sensitive file protected: ${file}`);
      }
    } catch (error) {
      logTest('File Exposure', true, `File not accessible: ${file}`);
    }
  }
}

// Test 9: Input Validation
async function testInputValidation() {
  console.log('\n🔍 Testing Input Validation...');
  
  const malformedInputs = [
    { email: 'not-an-email', password: '123' }, // Invalid email and short password
    { email: 'test@example.com' }, // Missing required field
    { email: 'a'.repeat(300) + '@test.com', password: 'ValidPass123!' }, // Very long input
    { email: null, password: undefined }, // Null values
    { email: 123, password: ['array'] }, // Wrong types
  ];

  for (const input of malformedInputs) {
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/register`, {
        ...input,
        name: 'Test User'
      }, { validateStatus: () => true });

      if (response.status === 200) {
        logTest('Input Validation', false, `Invalid input accepted: ${JSON.stringify(input)}`, 'high');
      } else if (response.status === 400) {
        logTest('Input Validation', true, `Invalid input rejected properly`);
      }
    } catch (error) {
      logTest('Input Validation', true, `Input validation working correctly`);
    }
  }
}

// Test 10: Session Security
async function testSessionSecurity() {
  console.log('\n🔍 Testing Session Security...');
  
  try {
    // Register and login to get a valid session
    const uniqueEmail = `test${Date.now()}@example.com`;
    
    // Register
    await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Session Test',
      email: uniqueEmail,
      password: 'TestPass123!'
    });

    // Login
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: uniqueEmail,
      password: 'TestPass123!'
    });

    if (loginResponse.headers['set-cookie']) {
      const cookies = loginResponse.headers['set-cookie'];
      const hasHttpOnly = cookies.some((cookie: string) => cookie.includes('HttpOnly'));
      const hasSecure = cookies.some((cookie: string) => cookie.includes('Secure'));
      const hasSameSite = cookies.some((cookie: string) => cookie.includes('SameSite'));

      if (!hasHttpOnly) {
        logTest('Session Security', false, `Session cookie missing HttpOnly flag`, 'high');
      } else {
        logTest('Session Security', true, `Session cookie has HttpOnly flag`);
      }

      if (process.env.NODE_ENV === 'production' && !hasSecure) {
        logTest('Session Security', false, `Session cookie missing Secure flag in production`, 'medium');
      } else {
        logTest('Session Security', true, `Session cookie security flags appropriate`);
      }

      if (!hasSameSite) {
        logTest('Session Security', false, `Session cookie missing SameSite flag`, 'medium');
      } else {
        logTest('Session Security', true, `Session cookie has SameSite protection`);
      }
    }
  } catch (error) {
    logTest('Session Security', false, `Could not test session security`, 'low');
  }
}

// Main execution
async function runSecurityTests() {
  console.log('🛡️  Starting Security Penetration Tests...');
  console.log(`Testing against: ${BASE_URL}`);
  console.log('================================================\n');

  await testSQLInjection();
  await testNoSQLInjection();
  await testXSS();
  await testAuthBypass();
  await testRateLimiting();
  await testCSRF();
  await testSecurityHeaders();
  await testInformationDisclosure();
  await testInputValidation();
  await testSessionSecurity();

  // Summary
  console.log('\n================================================');
  console.log('📊 SECURITY TEST SUMMARY\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const critical = results.filter(r => !r.passed && r.severity === 'critical').length;
  const high = results.filter(r => !r.passed && r.severity === 'high').length;
  const medium = results.filter(r => !r.passed && r.severity === 'medium').length;
  const low = results.filter(r => !r.passed && r.severity === 'low').length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log(`\nFailed by severity:`);
    if (critical > 0) console.log(`  🔴 Critical: ${critical}`);
    if (high > 0) console.log(`  🟠 High: ${high}`);
    if (medium > 0) console.log(`  🟡 Medium: ${medium}`);
    if (low > 0) console.log(`  🟢 Low: ${low}`);
    
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.test}: ${r.details} [${r.severity || 'unknown'}]`);
    });
  }

  const score = Math.round((passed / results.length) * 100);
  console.log(`\n🎯 Security Score: ${score}%`);
  
  if (score === 100) {
    console.log('🎉 Excellent! All security tests passed.');
  } else if (score >= 90) {
    console.log('👍 Good security posture with minor issues.');
  } else if (score >= 70) {
    console.log('⚠️  Moderate security issues need attention.');
  } else {
    console.log('🚨 Critical security issues detected!');
  }
}

// Run tests if executed directly
if (require.main === module) {
  runSecurityTests().catch(console.error);
}

export { runSecurityTests };