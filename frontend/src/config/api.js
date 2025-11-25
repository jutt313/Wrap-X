// API Configuration
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || 'https://wrap-x-198767072474.us-central1.run.app',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

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

