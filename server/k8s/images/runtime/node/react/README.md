# DevsArena React + Vite Template

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Features

- ⚡ Lightning-fast development with Vite
- 🔥 Hot Module Replacement (HMR)
- 🛠️ ESLint configuration
- 🎨 Modern React setup

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Important Notes

⚠️ **Port Configuration**: This React application runs on port **5173** by default. Do not change this port as it's configured in the Kubernetes deployment and changing it will break the application functionality.

## Development

The application is configured to work with the DevsArena platform. The port is set via the `REACT_PORT` environment variable.

```bash
# The app will automatically use the correct port when deployed
REACT_PORT=5173 npm run dev
```

## Available Plugins

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
