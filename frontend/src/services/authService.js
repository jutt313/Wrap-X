import { apiClient } from '../api/client';

class AuthService {
  async register(email, password, name) {
    try {
      const payload = {
        email,
        password,
        confirm_password: password,
        name: name || null
      };
      console.log('Register payload:', payload);
      const response = await apiClient.post('/api/auth/register', payload);
      
      if (response.access_token) {
        apiClient.setToken(response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
      }
      
      return response;
    } catch (error) {
      // Extract error message from response if available
      if (error.message) {
        throw error;
      }
      throw new Error('Registration failed. Please try again.');
    }
  }

  async login(email, password) {
    try {
      const response = await apiClient.post('/api/auth/login', {
        email,
        password
      });
      
      console.log('Login response received:', { 
        hasAccessToken: !!response.access_token,
        hasRefreshToken: !!response.refresh_token,
        tokenType: response.token_type
      });
      
      if (response.access_token) {
        console.log('Setting token in localStorage...');
        apiClient.setToken(response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        
        // Verify token was saved
        const savedToken = apiClient.getToken();
        console.log('Token saved verification:', { 
          saved: !!savedToken,
          tokenLength: savedToken?.length,
          matches: savedToken === response.access_token
        });
      } else {
        console.error('No access_token in login response:', response);
      }
      
      return response;
    } catch (error) {
      if (error.message) {
        throw error;
      }
      throw new Error('Login failed. Please check your credentials.');
    }
  }

  async logout() {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      apiClient.removeToken();
      localStorage.removeItem('refresh_token');
    }
  }

  async getProfile() {
    return await apiClient.get('/api/auth/me');
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post('/api/auth/refresh', {
      refresh_token: refreshToken
    });

    if (response.access_token) {
      apiClient.setToken(response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
    }

    return response;
  }

  async forgotPassword(email) {
    return await apiClient.post('/api/auth/forgot-password', { email });
  }

  async resetPassword(token, newPassword, confirmPassword) {
    return await apiClient.post('/api/auth/reset-password', {
      token,
      new_password: newPassword,
      confirm_password: confirmPassword
    });
  }

  isAuthenticated() {
    return !!apiClient.getToken();
  }
}

export const authService = new AuthService();

