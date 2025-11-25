// API Configuration
// In production, always use Cloud Run URL unless VITE_API_URL is explicitly set
const getBaseURL = () => {
  const envURL = import.meta.env.VITE_API_URL;
  const defaultURL = 'https://wrap-x-198767072474.us-central1.run.app';
  
  // If VITE_API_URL is set and not localhost, use it
  if (envURL && !envURL.includes('localhost') && !envURL.includes('127.0.0.1')) {
    return envURL;
  }
  
  // In production, always use Cloud Run
  if (import.meta.env.PROD) {
    return defaultURL;
  }
  
  // In development, use env URL or default to localhost for Vite proxy
  return envURL || 'http://localhost:8000';
};

export const API_CONFIG = {
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Log the baseURL for debugging
console.log('🔧 API Config initialized:', {
  baseURL: API_CONFIG.baseURL,
  envVITE_API_URL: import.meta.env.VITE_API_URL,
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD
});

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
  },
  // Users
  users: {
    profile: '/api/users/profile',
    update: '/api/users/update',
  },
  // Projects
  projects: {
    list: '/api/projects',
    create: '/api/projects',
    get: '/api/projects/:id',
    update: '/api/projects/:id',
    delete: '/api/projects/:id',
  },
  // LLM Providers
  providers: {
    list: '/api/providers',
    create: '/api/providers',
    update: '/api/providers/:id',
    delete: '/api/providers/:id',
  },
  // Wrapped APIs
  wrappedAPIs: {
    list: '/api/wrapped-apis',
    create: '/api/wrapped-apis',
    get: '/api/wrapped-apis/:id',
    update: '/api/wrapped-apis/:id',
    delete: '/api/wrapped-apis/:id',
  },
  // Prompt Configs
  promptConfigs: {
    get: '/api/wrapped-apis/:id/config',
    update: '/api/wrapped-apis/:id/config',
  },
  // Tools
  tools: {
    list: '/api/tools',
    create: '/api/tools',
    update: '/api/tools/:id',
    delete: '/api/tools/:id',
  },
  // Webhooks
  webhooks: {
    list: '/api/wrapped-apis/:id/webhooks',
    create: '/api/wrapped-apis/:id/webhooks',
    update: '/api/webhooks/:id',
    delete: '/api/webhooks/:id',
  },
  // API Keys
  apiKeys: {
    list: '/api/wrapped-apis/:id/keys',
    create: '/api/wrapped-apis/:id/keys',
    delete: '/api/keys/:id',
  },
};

