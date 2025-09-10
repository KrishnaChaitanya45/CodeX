const http = require('http');


// IMPORTANT: Do not change this port! It's configured in Internally to expose this PORT
// and changing it will break the application functionality.
const port = process.env.NODE_PORT || 8000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');

  if (req.url === '/') {
    res.end('Hello World from DevsArena Node.js App!\n');
  } else if (req.url === '/api/health') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'devs-arena-node-app'
    }));
  } else {
    res.statusCode = 404;
    res.end('Not Found\n');
  }
});

server.listen(port, () => {
  console.log(`🚀 DevsArena Node.js server running at ${port}`);
  console.log(`📊 Health check available at /api/health`);
});
