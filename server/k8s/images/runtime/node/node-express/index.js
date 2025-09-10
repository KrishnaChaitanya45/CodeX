const express = require('express');
const app = express();

// IMPORTANT: Do not change this port! It's configured in Internally to expose this PORT
// and changing it will break the application functionality.
const port = process.env.NODE_EXPRESS_PORT || 4000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to DevsArena Express App!',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      users: '/api/users',
      posts: '/api/posts'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'devs-arena-express-app',
    uptime: process.uptime()
  });
});

// Sample API routes
app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ]);
});

app.get('/api/posts', (req, res) => {
  res.json([
    { id: 1, title: 'First Post', content: 'This is the first post content' },
    { id: 2, title: 'Second Post', content: 'This is the second post content' }
  ]);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(port, () => {
  console.log(`🚀 DevsArena Express server running at ${port}/`);
  console.log(`📊 Health check available at ${port}/api/health`);
  console.log(`📋 API endpoints:`);
  console.log(`   GET  /api/users`);
  console.log(`   GET  /api/posts`);
});
