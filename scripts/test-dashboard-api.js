const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_USER_EMAIL = 'test@example.com'; // Replace with your test user email
const TEST_USER_PASSWORD = 'password123'; // Replace with your test user password

async function testDashboardAPI() {
  console.log('=== Testing Dashboard API ===\n');

  try {
    // Step 1: Login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });

    const { token, user } = loginResponse.data;
    console.log(`✓ Logged in as: ${user.email} (ID: ${user._id})`);
    console.log(`✓ Token received: ${token.substring(0, 20)}...`);

    // Step 2: Test debug endpoint
    console.log('\n2. Testing debug/user-affinities endpoint...');
    try {
      const debugResponse = await axios.get(`${BASE_URL}/api/v1/debug/user-affinities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✓ Debug endpoint response:');
      console.log('  User ID:', debugResponse.data.userId);
      console.log('  Affinities count:', debugResponse.data.affinities.length);
      if (debugResponse.data.affinities.length > 0) {
        console.log('  First affinity:', JSON.stringify(debugResponse.data.affinities[0], null, 2));
      }
    } catch (error) {
      console.error('✗ Debug endpoint error:', error.response?.data || error.message);
    }

    // Step 3: Test dashboard endpoint
    console.log('\n3. Testing user/dashboard endpoint...');
    try {
      const dashboardResponse = await axios.get(`${BASE_URL}/api/v1/user/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✓ Dashboard endpoint response:');
      console.log('  Username:', dashboardResponse.data.username);
      console.log('  Balance:', dashboardResponse.data.balance);
      console.log('  Affinities type:', typeof dashboardResponse.data.affinities);
      console.log('  Affinities count:', dashboardResponse.data.affinities?.length || 0);
      console.log('  Full affinities data:', JSON.stringify(dashboardResponse.data.affinities, null, 2));
      console.log('  All dashboard data:', JSON.stringify(dashboardResponse.data, null, 2));
    } catch (error) {
      console.error('✗ Dashboard endpoint error:', error.response?.data || error.message);
    }

    // Step 4: Test with raw MongoDB query
    console.log('\n4. Testing raw database query...');
    // This would need to be done in the backend, but let's see what the API returns

  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
  }
}

// Run the test
testDashboardAPI().catch(console.error);