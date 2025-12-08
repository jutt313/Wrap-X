import { apiClient } from '../api/client';

class WrappedAPIService {
  async createWrappedAPI(name, projectId, providerId) {
    try {
      return await apiClient.post('/api/wrapped-apis/', {
        name,
        project_id: projectId || null,
        provider_id: providerId
      });
    } catch (error) {
      console.error('Error creating wrapped API:', error);
      throw error;
    }
  }

  async getWrappedAPIs() {
    try {
      return await apiClient.get('/api/wrapped-apis');
    } catch (error) {
      console.error('Error fetching wrapped APIs:', error);
      throw error;
    }
  }

  async getWrappedAPI(id) {
    try {
      return await apiClient.get(`/api/wrapped-apis/${id}`);
    } catch (error) {
      console.error(`Error fetching wrapped API ${id}:`, error);
      throw error;
    }
  }

  async updateWrappedAPI(id, data) {
    try {
      return await apiClient.put(`/api/wrapped-apis/${id}`, data);
    } catch (error) {
      console.error(`Error updating wrapped API ${id}:`, error);
      throw error;
    }
  }

  async deleteWrappedAPI(id) {
    try {
      return await apiClient.delete(`/api/wrapped-apis/${id}`);
    } catch (error) {
      console.error(`Error deleting wrapped API ${id}:`, error);
      throw error;
    }
  }

  async getAPIKey(wrappedApiId) {
    try {
      return await apiClient.post(`/api/wrapped-apis/${wrappedApiId}/api-key`);
    } catch (error) {
      console.error(`Error getting API key for wrapped API ${wrappedApiId}:`, error);
      throw error;
    }
  }

  async listAPIKeys(wrappedApiId) {
    try {
      return await apiClient.get(`/api/wrapped-apis/${wrappedApiId}/api-keys`);
    } catch (error) {
      console.error(`Error listing API keys for wrapped API ${wrappedApiId}:`, error);
      throw error;
    }
  }

  async createAPIKey(wrappedApiId, keyName) {
    try {
      return await apiClient.post(`/api/wrapped-apis/${wrappedApiId}/api-keys`, {
        key_name: keyName
      });
    } catch (error) {
      console.error(`Error creating API key for wrapped API ${wrappedApiId}:`, error);
      throw error;
    }
  }

  async deleteAPIKey(apiKeyId) {
    try {
      return await apiClient.delete(`/api/wrapped-apis/api-keys/${apiKeyId}`);
    } catch (error) {
      console.error(`Error deleting API key ${apiKeyId}:`, error);
      throw error;
    }
  }

  async getAllAPIKeys() {
    try {
      return await apiClient.get('/api/wrapped-apis/api-keys/all');
    } catch (error) {
      console.error('Error fetching all API keys:', error);
      throw error;
    }
  }

  async deleteAllWraps() {
    try {
      return await apiClient.delete('/api/wrapped-apis/all');
    } catch (error) {
      console.error('Error deleting all wraps:', error);
      throw error;
    }
  }
}

export const wrappedApiService = new WrappedAPIService();

