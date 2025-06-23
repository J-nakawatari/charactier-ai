const fetch = require('node-fetch');

async function testAuth() {
  console.log('🚀 Starting authentication test...\n');
  
  try {
    // 1. Test direct backend auth status
    console.log('1️⃣ Testing backend auth status directly...');
    const backendStatus = await fetch('http://localhost:5000/api/debug/auth-status');
    const backendData = await backendStatus.json();
    console.log('Backend response:', backendData);
    console.log('✅ Backend is responding\n');
    
    // 2. Test frontend proxy
    console.log('2️⃣ Testing frontend proxy...');
    const frontendStatus = await fetch('http://localhost:3000/api/debug/auth-status');
    const frontendData = await frontendStatus.json();
    console.log('Frontend proxy response:', frontendData);
    console.log('✅ Frontend proxy is working\n');
    
    // 3. Test admin login
    console.log('3️⃣ Testing admin login...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });
    
    console.log('Login status:', loginResponse.status);
    const setCookieHeaders = loginResponse.headers.raw()['set-cookie'];
    console.log('Set-Cookie headers:', setCookieHeaders);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('Login response:', loginData);
      
      // Extract cookies
      const cookies = setCookieHeaders
        ? setCookieHeaders.map(c => c.split(';')[0]).join('; ')
        : '';
      
      console.log('Extracted cookies:', cookies);
      console.log('✅ Admin login successful\n');
      
      // 4. Test authenticated endpoint with cookies
      console.log('4️⃣ Testing authenticated endpoint with cookies...');
      const authTestResponse = await fetch('http://localhost:3000/api/debug/auth-test', {
        headers: {
          'Cookie': cookies
        }
      });
      
      console.log('Auth test status:', authTestResponse.status);
      if (authTestResponse.ok) {
        const authTestData = await authTestResponse.json();
        console.log('Authenticated response:', authTestData);
        console.log('✅ Authentication working correctly!');
      } else {
        const errorData = await authTestResponse.text();
        console.log('❌ Authentication failed:', errorData);
      }
    } else {
      const errorText = await loginResponse.text();
      console.log('❌ Login failed:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuth();