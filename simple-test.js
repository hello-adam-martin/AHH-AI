// Simple standalone test server
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: true,
    message: 'Simple test server working',
    path: req.url,
    method: req.method
  }));
});

const port = 3333;
server.listen(port, () => {
  console.log(`🧪 Simple test server running on port ${port}`);
});

// Keep alive
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close();
});

setTimeout(() => {
  console.log('Server still alive after 10 seconds');
}, 10000);