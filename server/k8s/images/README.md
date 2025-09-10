# DevsArena Runtime Images

This directory contains the runtime images and configurations for DevsArena applications.

## Directory Structure

```
images/
├── README.md (this file)
└── runtime/
    └── node/
        ├── Dockerfile (single generic Dockerfile for all Node.js apps)
        ├── react/ (React + Vite boilerplate)
        ├── node/ (Pure Node.js boilerplate)
        └── node-express/ (Express.js boilerplate)
```

## Centralized PTY Service

The PTY (Pseudo Terminal) service code is centralized in:
```
k8s/internal/pty/
├── go.mod
├── go.sum
├── main.go
├── pty.go
├── redis.go
└── ws-server.go
```

This eliminates code duplication and makes maintenance easier.

## Supported Applications

### React (Vite)
- **Location**: `runtime/node/react/`
- **Start Commands**: `["npm install", "npm run dev"]`
- **Port**: 5173 (development), 4173 (preview)
- **Features**: Hot reload, modern React with Vite

### Node.js
- **Location**: `runtime/node/node/`
- **Start Commands**: `["npm install", "npm run dev"]`
- **Port**: 3000
- **Features**: Basic HTTP server with health check

### Node-Express
- **Location**: `runtime/node/node-express/`
- **Start Commands**: `["npm install", "npm run dev"]`
- **Port**: 3000
- **Features**: Express.js REST API with sample endpoints

## Generic Dockerfile

The `runtime/node/Dockerfile` is a generic multi-stage build that:

1. **Stage 1**: Builds the PTY server binary from Go source
2. **Stage 2**: Creates Node.js runtime with PTY integration

### Key Features:
- ✅ **Security**: Non-root user (`appuser`)
- ✅ **PTY Integration**: WebSocket terminal support
- ✅ **Nodemon**: Global installation for development
- ✅ **Multi-app Support**: Works with React, Node.js, and Express
- ✅ **Port Flexibility**: Exposes common development ports

## Usage

### Building for Specific App Type

```bash
# Build React app
docker build -f runtime/node/Dockerfile -t devs-arena-react ./runtime/node/react

# Build Node.js app
docker build -f runtime/node/Dockerfile -t devs-arena-node ./runtime/node/node

# Build Express app
docker build -f runtime/node/Dockerfile -t devs-arena-express ./runtime/node/node-express
```

### Development Workflow

Each application supports:
- `npm install` - Install dependencies
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server

## PTY Service Integration

The PTY service provides:
- WebSocket-based terminal access
- Command execution and output streaming
- Security filtering and user isolation
- Redis integration for session management

## Maintenance

- **PTY Updates**: Modify files in `k8s/internal/pty/`
- **App Templates**: Update respective app directories
- **Dockerfile**: Generic, works for all Node.js applications
- **Dependencies**: Update package.json in each app directory
