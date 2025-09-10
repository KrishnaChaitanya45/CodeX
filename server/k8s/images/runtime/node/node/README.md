# DevsArena Node.js Template

A simple Node.js boilerplate application for DevsArena.

## Features

- 🚀 Simple HTTP server with health check endpoint
- � RESTful API structure
- �🔧 Ready for development with nodemon
- 🐳 Docker support with PTY integration

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode (with nodemon)
npm run dev

# Run in production mode
npm start
```

## API Endpoints

- `GET /` - Welcome message
- `GET /api/health` - Health check

## Important Notes

⚠️ **Port Configuration**: This application runs on port **8000** by default. Do not change this port as it's configured in the Kubernetes deployment and changing it will break the application functionality.

## Development

The application is configured to work with the DevsArena platform. The port is set via the `NODE_PORT` environment variable.

```bash
# The app will automatically use the correct port when deployed
NODE_PORT=8000 npm run dev
```
