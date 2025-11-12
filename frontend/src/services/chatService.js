import { apiClient } from '../api/client';

class ChatService {
  async sendConfigMessage(wrappedApiId, message) {
    try {
      return await apiClient.post(`/api/wrapped-apis/${wrappedApiId}/chat/config`, {
        message
      });
    } catch (error) {
      console.error('Error sending config message:', error);
      throw error;
    }
  }

  async sendTestMessage(endpointId, message) {
    try {
      // Call the wrapped API endpoint with a single message
      // The endpoint expects { message: string } format
      return await apiClient.post(`/api/wrapped-apis/${endpointId}/chat`, {
        message
      });
    } catch (error) {
      console.error('Error sending test message:', error);
      throw error;
    }
  }

  async getConfigMessages(wrappedApiId) {
    try {
      return await apiClient.get(`/api/wrapped-apis/${wrappedApiId}/chat/config`);
    } catch (error) {
      console.error('Error fetching config messages:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService();

