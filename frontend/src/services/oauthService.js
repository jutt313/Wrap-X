import { apiClient } from '../api/client';

class OAuthService {
  async getSetup(provider, wrappedApiId, scopes = []) {
    const params = new URLSearchParams();
    params.append('wrapped_api_id', wrappedApiId);
    if (scopes.length) {
      params.append('scopes', scopes.join(','));
    }
    const response = await apiClient.get(`/api/oauth/${provider}/setup?${params.toString()}`);
    return response.data;
  }

  async authorize(provider, payload) {
    const response = await apiClient.post(`/api/oauth/${provider}/authorize`, {
      wrapped_api_id: payload.wrappedApiId,
      client_id: payload.clientId,
      client_secret: payload.clientSecret,
      scopes: payload.scopes,
      extra_params: payload.extraParams || null,
    });
    return response.data;
  }

  async refresh(provider, wrappedApiId) {
    const response = await apiClient.post(`/api/oauth/${provider}/refresh`, {
      wrapped_api_id: wrappedApiId,
    });
    return response.data;
  }
}

const oauthService = new OAuthService();
export default oauthService;

