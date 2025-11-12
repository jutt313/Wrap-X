import { apiClient } from '../api/client';

class ProfileService {
  async getProfile() {
    try {
      return await apiClient.get('/api/auth/me');
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  }

  async updateProfile(name, avatarUrl) {
    try {
      return await apiClient.put('/api/auth/profile', {
        name,
        avatar_url: avatarUrl
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  async changePassword(currentPassword, newPassword, confirmPassword) {
    try {
      return await apiClient.post('/api/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
}

export const profileService = new ProfileService();

