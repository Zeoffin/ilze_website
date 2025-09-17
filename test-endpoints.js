// Test script to verify API endpoints
const http = require('http');

const testEndpoint = (path, method = 'GET', data = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

const runTests = async () => {
  console.log('Testing API endpoints...\n');

  try {
    // Test main page
    console.log('1. Testing main page (GET /)');
    const mainPage = await testEndpoint('/');
    console.log(`   Status: ${mainPage.status}`);
    console.log(`   Content-Type: ${mainPage.headers['content-type']}`);

    // Test admin status endpoint
    console.log('\n2. Testing admin status (GET /admin/status)');
    const adminStatus = await testEndpoint('/admin/status');
    console.log(`   Status: ${adminStatus.status}`);
    console.log(`   Response: ${adminStatus.body}`);

    // Test content API endpoint
    console.log('\n3. Testing content API (GET /api/content/interesanti)');
    const contentApi = await testEndpoint('/api/content/interesanti');
    console.log(`   Status: ${contentApi.status}`);
    console.log(`   Response: ${contentApi.body}`);

    // Test invalid section
    console.log('\n4. Testing invalid section (GET /api/content/invalid)');
    const invalidSection = await testEndpoint('/api/content/invalid');
    console.log(`   Status: ${invalidSection.status}`);
    console.log(`   Response: ${invalidSection.body}`);

    console.log('\n✓ All endpoint tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Wait a moment for server to start, then run tests
setTimeout(runTests, 2000);