import { apiClient } from '../api/client';

/**
 * Service for managing platform integrations (tools with credentials)
 */
class PlatformIntegrationService {
  /**
   * Get all integrations for a wrapped API
   */
  async getIntegrations(wrappedApiId) {
    const response = await apiClient.get(`/api/wrapped-apis/${wrappedApiId}/integrations`);
    return response.data;
  }

  /**
   * Save integration credentials
   */
  async saveIntegration(wrappedApiId, integrationData) {
    const response = await apiClient.post(
      `/api/wrapped-apis/${wrappedApiId}/integrations`,
      integrationData
    );
    return response.data;
  }

  /**
   * Test integration credentials
   */
  async testIntegration(wrappedApiId, toolName, credentials, toolCode = null) {
    const response = await apiClient.post(
      `/api/wrapped-apis/${wrappedApiId}/integrations/${toolName}/test`,
      {
        credentials,
        tool_code: toolCode
      }
    );
    return response.data;
  }

  /**
   * Update integration metadata
   */
  async updateIntegration(wrappedApiId, toolName, updateData) {
    const response = await apiClient.patch(
      `/api/wrapped-apis/${wrappedApiId}/integrations/${toolName}`,
      updateData
    );
    return response.data;
  }

  /**
   * Delete integration
   */
  async deleteIntegration(wrappedApiId, toolName) {
    const response = await apiClient.delete(
      `/api/wrapped-apis/${wrappedApiId}/integrations/${toolName}`
    );
    return response.data;
  }
}

export default new PlatformIntegrationService();

