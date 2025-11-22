import { apiClient } from '../api/client';

class ChatService {
  async sendConfigMessage(wrappedApiId, message) {
    try {
      // Apply changes so the backend persists config instead of only previewing
      // If you prefer conditional apply, wire a UI flag and pass it here.
      return await apiClient.post(`/api/wrapped-apis/${wrappedApiId}/chat/config`, {
        message,
        apply: true
      });
    } catch (error) {
      // Gracefully surface server validation messages as normal responses
      const safeMessage = (error && error.message) ? String(error.message) : 'Validation failed. Please adjust and try again.';
      return {
        parsed_updates: {},
        response: safeMessage,
        diff: {},
        requires_confirmation: true,
      };
    }
  }

  async sendTestMessage(endpointId, messageOrMessages) {
    try {
      // Use new simplified endpoint /api/wrap-x/chat
      // For authenticated users testing, we still need endpoint_id in the request
      // For external API calls, only API key is needed (endpoint_id is looked up from key)
      const requestBody = {};
      
      // Check if it's an array (conversation history) or single message
      if (Array.isArray(messageOrMessages)) {
        // Send as OpenAI-compatible format with full conversation
        requestBody.messages = messageOrMessages;
      } else {
        // Send as single message format
        requestBody.message = messageOrMessages;
      }
      
      // For authenticated users testing, include endpoint_id
      // For external calls, API key will identify the wrapped API
      if (endpointId) {
        requestBody.endpoint_id = endpointId;
      }
      
      return await apiClient.post('/api/wrap-x/chat', requestBody);
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
