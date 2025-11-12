# Wrap-X Frontend

React + Vite frontend for Wrap-X AI API wrapper platform.

## Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite 7
- **Language**: JavaScript (ES6+)

## Project Structure

```
frontend/
├── src/
│   ├── api/           # API client and request handling
│   │   └── client.js  # Main API client
│   ├── config/        # Configuration files
│   │   └── api.js     # API endpoints and config
│   ├── services/      # Business logic services
│   ├── utils/         # Utility functions
│   └── ...
├── public/            # Static assets
├── .env               # Environment variables
└── vite.config.js     # Vite configuration
```

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

Dependencies are already installed. To reinstall:

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build

Build for production:

```bash
npm run build
```

### Preview

Preview production build:

```bash
npm run preview
```

## Configuration

### Environment Variables

Create a `.env` file (or use the existing one):

```
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=Wrap-X
```

### API Proxy

Vite is configured to proxy `/api/*` requests to `http://localhost:8000` (backend server).

## API Client

The API client is set up in `src/api/client.js` and can be imported:

```javascript
import { apiClient } from './api/client.js';

// Example usage
const data = await apiClient.get('/api/endpoint');
```

## Next Steps

- Add UI components
- Implement authentication
- Build pages for:
  - Dashboard
  - Projects
  - Wrapped APIs
  - Chat interface for configuration
  - Tools management
