// Simple test to verify the dashboard API fix
const http = require('http');

// Test credentials - replace with your actual test user
const credentials = {
  email: 'jun@example.com',
  password: 'test123'
};

// Login request
const loginData = JSON.stringify(credentials);
const loginOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('=== Testing Dashboard API Fix ===\n');
console.log('1. Attempting login...');

const loginReq = http.request(loginOptions, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.log('Login failed:', res.statusCode, data);
      return;
    }
    
    try {
      const response = JSON.parse(data);
      const token = response.token;
      
      if (!token) {
        console.log('No token received');
        return;
      }
      
      console.log('✓ Login successful');
      console.log('✓ Token:', token.substring(0, 30) + '...\n');
      
      // Test dashboard endpoint
      testDashboard(token);
      
    } catch (e) {
      console.log('Error parsing response:', e);
    }
  });
});

loginReq.on('error', (e) => {
  console.error('Login request error:', e);
});

loginReq.write(loginData);
loginReq.end();

function testDashboard(token) {
  const dashboardOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/user/dashboard',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  
  console.log('2. Testing dashboard endpoint...');
  
  const dashboardReq = http.request(dashboardOptions, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.log('Dashboard request failed:', res.statusCode, data);
        return;
      }
      
      try {
        const response = JSON.parse(data);
        
        console.log('✓ Dashboard response received');
        console.log('\nAffinities data:');
        console.log('- Count:', response.affinities?.length || 0);
        
        if (response.affinities && response.affinities.length > 0) {
          console.log('- First affinity:');
          const first = response.affinities[0];
          console.log('  - Character ID:', first.character?._id);
          console.log('  - Character name:', first.character?.name);
          console.log('  - Level:', first.level);
          console.log('  - Experience:', first.experience);
          console.log('  - Character populated:', typeof first.character === 'object' ? 'YES' : 'NO');
        } else {
          console.log('- No affinities found');
        }
        
        // Also test debug endpoint
        testDebugEndpoint(token);
        
      } catch (e) {
        console.log('Error parsing dashboard response:', e);
      }
    });
  });
  
  dashboardReq.on('error', (e) => {
    console.error('Dashboard request error:', e);
  });
  
  dashboardReq.end();
}

function testDebugEndpoint(token) {
  const debugOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/debug/user-affinities',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  
  console.log('\n3. Testing debug endpoint for comparison...');
  
  const debugReq = http.request(debugOptions, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.log('Debug request failed:', res.statusCode, data);
        return;
      }
      
      try {
        const response = JSON.parse(data);
        
        console.log('✓ Debug response received');
        console.log('- Affinities count:', response.affinitiesCount || 0);
        console.log('- Raw affinities:', response.rawAffinities?.length || 0);
        console.log('- Populated affinities:', response.populatedAffinities?.length || 0);
        
        console.log('\n=== Summary ===');
        console.log('The dashboard endpoint should now return populated character data in affinities.');
        console.log('If affinities are still empty, check:');
        console.log('1. The user has actual affinity data in the database');
        console.log('2. The character IDs in affinities are valid');
        console.log('3. MongoDB connection is working properly');
        
      } catch (e) {
        console.log('Error parsing debug response:', e);
      }
    });
  });
  
  debugReq.on('error', (e) => {
    console.error('Debug request error:', e);
  });
  
  debugReq.end();
}