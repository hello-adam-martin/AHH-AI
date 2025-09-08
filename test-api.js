// Simple test script for the API server
const http = require('http');

async function testHealthEndpoint() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3333,
      path: '/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ Health check response:', response);
          resolve(response);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(5000, () => reject(new Error('Request timeout')));
    req.end();
  });
}

async function testEmailEndpoint() {
  return new Promise((resolve, reject) => {
    const testEmail = JSON.stringify({
      from: 'guest@example.com',
      to: 'info@akaroaholidayhomes.co.nz',
      subject: 'Test inquiry',
      body: 'Hello, when is check-in time?'
    });

    const options = {
      hostname: 'localhost',
      port: 3333,
      path: '/api/email/process',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testEmail),
        'X-API-Key': process.env.API_KEY || 'test-key'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('📧 Email process response:', response);
          resolve(response);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(10000, () => reject(new Error('Request timeout')));
    req.write(testEmail);
    req.end();
  });
}

console.log('🧪 Testing API endpoints...\n');

// Wait a moment for server to start, then test
setTimeout(async () => {
  try {
    await testHealthEndpoint();
    console.log('');
    await testEmailEndpoint();
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}, 2000);