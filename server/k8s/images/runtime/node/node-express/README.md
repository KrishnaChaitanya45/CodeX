# DevsArena Node-Express Template

A Node.js Express boilerplate application for DevsArena with REST API endpoints.

## Features

- 🚀 Express.js web framework
- 📊 RESTful API endpoints
- 🔧 Development with nodemon
- 🐳 Docker support with PTY integration
- 📝 JSON middleware
- 🛠️ Error handling

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

- `GET /` - Welcome message with available endpoints
- `GET /api/health` - Health check with uptime
- `GET /api/users` - Sample users data
- `GET /api/posts` - Sample posts data

## Important Notes

⚠️ **Port Configuration**: This application runs on port **4000** by default. Do not change this port as it's configured in the Kubernetes deployment and changing it will break the application functionality.

## Development

The application is configured to work with the DevsArena platform. The port is set via the `NODE_EXPRESS_PORT` environment variable.

```bash
# The app will automatically use the correct port when deployed
NODE_EXPRESS_PORT=4000 npm run dev
```

## Project Structure

```
├── index.js          # Main application file
├── package.json      # Dependencies and scripts
└── README.md         # This file
```

## Adding New Routes

Add new routes in `index.js`:

```javascript
app.get('/api/new-endpoint', (req, res) => {
  res.json({ message: 'New endpoint!' });
});
```
