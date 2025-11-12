import { apiClient } from '../api/client';

class LLMProviderService {
  async getSupportedProviders() {
    try {
      return await apiClient.get('/api/llm-providers/supported');
    } catch (error) {
      console.error('Error fetching supported providers:', error);
      throw error;
    }
  }

  async getProviders(projectId = null) {
    try {
      // Use trailing slash to avoid redirect that can drop Authorization across origins
      const url = projectId 
        ? `/api/llm-providers/?project_id=${projectId}`
        : '/api/llm-providers/';
      return await apiClient.get(url);
    } catch (error) {
      console.error('Error fetching providers:', error);
      throw error;
    }
  }

  async createProvider(name, projectId, providerName, apiKey, apiBaseUrl = null) {
    try {
      // Validate inputs
      if (!projectId || projectId <= 0) {
        throw new Error('Valid project ID is required');
      }
      
      console.log('Creating provider with:', {
        name,
        projectId,
        providerName,
        hasApiKey: !!apiKey,
        apiBaseUrl
      });
      
      const payload = {
        name: name,
        project_id: projectId, // Ensure it's a number
        provider_name: providerName,
        api_key: apiKey,
        api_base_url: apiBaseUrl
      };
      
      console.log('Sending payload:', { ...payload, api_key: '***' });
      
      // Use trailing slash to avoid redirect issues
      return await apiClient.post('/api/llm-providers/', payload);
    } catch (error) {
      console.error('Error creating provider:', error);
      throw error;
    }
  }

  async deleteProvider(providerId) {
    try {
      return await apiClient.delete(`/api/llm-providers/${providerId}`);
    } catch (error) {
      console.error(`Error deleting provider ${providerId}:`, error);
      throw error;
    }
  }
}

export const llmProviderService = new LLMProviderService();
