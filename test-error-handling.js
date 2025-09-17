/**
 * Simple test script to verify error handling functionality
 */

const http = require('http');

// Test server error handling
function testServerErrorHandling() {
    console.log('Testing server error handling...');
    
    // Test 404 handling
    const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/nonexistent-page',
        method: 'GET'
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log('404 Test - Status:', res.statusCode);
            if (res.statusCode === 302) {
                console.log('✓ 404 handling works - redirects to main page');
            } else {
                console.log('✗ Unexpected status code for 404');
            }
        });
    });
    
    req.on('error', (err) => {
        console.log('✗ Server not running or connection error:', err.message);
    });
    
    req.end();
}

// Test API error handling
function testAPIErrorHandling() {
    console.log('\nTesting API error handling...');
    
    // Test invalid JSON
    const postData = '{"invalid": json}';
    
    const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/contact',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log('Invalid JSON Test - Status:', res.statusCode);
            try {
                const response = JSON.parse(data);
                if (res.statusCode === 400 && response.error === 'Invalid JSON format') {
                    console.log('✓ Invalid JSON error handling works');
                } else {
                    console.log('✗ Unexpected response for invalid JSON:', response);
                }
            } catch (e) {
                console.log('✗ Could not parse error response');
            }
        });
    });
    
    req.on('error', (err) => {
        console.log('✗ API request error:', err.message);
    });
    
    req.write(postData);
    req.end();
}

// Test content loading
function testContentLoading() {
    console.log('\nTesting content loading...');
    
    const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/content/interesanti',
        method: 'GET'
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log('Content Loading Test - Status:', res.statusCode);
            try {
                const response = JSON.parse(data);
                if (res.statusCode === 200 && response.success) {
                    console.log('✓ Content loading works');
                    console.log('  - Request ID:', response.meta?.requestId);
                    console.log('  - Duration:', response.meta?.duration);
                } else {
                    console.log('✗ Unexpected response for content loading:', response);
                }
            } catch (e) {
                console.log('✗ Could not parse content response');
            }
        });
    });
    
    req.on('error', (err) => {
        console.log('✗ Content loading error:', err.message);
    });
    
    req.end();
}

// Run tests
console.log('Starting error handling tests...\n');

setTimeout(() => {
    testServerErrorHandling();
}, 100);

setTimeout(() => {
    testAPIErrorHandling();
}, 500);

setTimeout(() => {
    testContentLoading();
}, 1000);

setTimeout(() => {
    console.log('\nError handling tests completed!');
    process.exit(0);
}, 2000);