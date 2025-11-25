// API Client Setup
import { API_CONFIG } from '../config/api.js';

class APIClient {
  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.timeout = API_CONFIG.timeout;
  }

  async request(endpoint, options = {}) {
    // Use relative URL for Vite proxy, or full URL if in production
    const isDevelopment = import.meta.env.DEV;
    const isLocalhost = this.baseURL.includes('localhost') || this.baseURL.includes('127.0.0.1');
    
    // Determine the final URL
    let url;
    if (isDevelopment && isLocalhost) {
      // Local dev: use relative URL to go through Vite proxy
      url = endpoint;
    } else {
      // Production: always use full baseURL
      url = `${this.baseURL}${endpoint}`;
    }
    
    // Detailed logging for debugging
    console.log('🔍 API Request Details:', {
      isDevelopment,
      isLocalhost,
      baseURL: this.baseURL,
      endpoint,
      finalURL: url,
      envVITE_API_URL: import.meta.env.VITE_API_URL,
      mode: import.meta.env.MODE,
      dev: import.meta.env.DEV,
      prod: import.meta.env.PROD
    });
    
    // Initialize headers - start with API config headers
    const headers = {
      ...API_CONFIG.headers,
    };
    
    // Merge any existing headers from options
    if (options.headers) {
      Object.assign(headers, options.headers);
    }
    
    // Add auth token if available (do this AFTER merging to ensure it's not overwritten)
    const token = this.getToken();
    if (token && token.trim()) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('Token found, Authorization header set:', { 
        hasToken: !!token, 
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...',
        authHeader: headers['Authorization']?.substring(0, 30) + '...',
        endpoint
      });
    } else {
      console.warn('No token found for request:', { 
        url, 
        endpoint,
        method: options.method,
        localStorageToken: localStorage.getItem('auth_token') ? 'exists' : 'missing',
        sessionStorageToken: sessionStorage.getItem('auth_token') ? 'exists' : 'missing'
      });
    }
    
    const config = {
      ...options,
      headers,
    };

    try {
      console.log('API Request:', { 
        url, 
        method: config.method, 
        body: config.body,
        headers: { 
          'Content-Type': config.headers['Content-Type'],
          'Authorization': config.headers['Authorization'] ? 'Bearer ***' : 'None'
        }
      });
      const response = await fetch(url, config);
      
      // Get response text for better error messages
      const responseText = await response.text();
      console.log('API Response:', { status: response.status, text: responseText.substring(0, 200) });
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = responseText ? JSON.parse(responseText) : { detail: `HTTP error! status: ${response.status}` };
        } catch {
          errorData = { detail: responseText || `HTTP error! status: ${response.status}` };
        }
        console.error('API Error Response:', errorData);
        
        // Handle authentication errors - show error, don't auto-redirect
        if (response.status === 401 || response.status === 403) {
          const authError = errorData.detail || 'Authentication failed';
          if (authError.includes('authenticated') || authError.includes('Invalid') || authError.includes('expired')) {
            // Clear invalid token silently - don't redirect automatically
            // Components will handle the error display
            try {
              apiClient.removeToken();
              localStorage.removeItem('refresh_token');
            } catch (e) {
              // Ignore errors when clearing tokens
            }
            // Throw error with clear message
            throw new Error('Authentication failed. Please refresh the page and log in again.');
          }
        }
        
        // Handle different error formats
        let errorMessage = errorData.detail;
        if (Array.isArray(errorData.detail)) {
          // Validation errors
          errorMessage = errorData.detail.map(e => e.message || e.msg).join(', ');
        } else if (typeof errorData.detail === 'object' && errorData.detail.message) {
          errorMessage = errorData.detail.message;
        } else if (typeof errorMessage === 'string') {
          errorMessage = errorMessage;
        } else {
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        
        throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
      }
      
      // Handle empty responses (common for DELETE requests)
      if (!responseText || responseText.trim() === '') {
        return { message: 'Success' };
      }
      
      try {
        return JSON.parse(responseText);
      } catch (e) {
        // If JSON parsing fails, return the text as message
        return { message: responseText || 'Success' };
      }
    } catch (error) {
      console.error('❌ API Request Error:', {
        error: error.message,
        url,
        endpoint,
        baseURL: this.baseURL,
        isDevelopment,
        stack: error.stack
      });
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        const errorMsg = isLocalhost 
          ? 'Cannot connect to server. Please make sure the backend is running on port 8000.'
          : `Cannot connect to server at ${this.baseURL}. Please check if the backend is running.`;
        throw new Error(errorMsg);
      }
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
      },
    });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
      },
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  getToken() {
    // Get token from localStorage or wherever it's stored
    const token = localStorage.getItem('auth_token');
    if (!token) {
      // Try to get from sessionStorage as fallback
      return sessionStorage.getItem('auth_token') || null;
    }
    return token;
  }

  setToken(token) {
    localStorage.setItem('auth_token', token);
  }

  removeToken() {
    localStorage.removeItem('auth_token');
  }
}

export const apiClient = new APIClient();

