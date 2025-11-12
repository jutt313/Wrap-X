import { apiClient } from '../api/client';

class NotificationService {
  async getNotifications(skip = 0, limit = 20) {
    try {
      return await apiClient.get(`/api/notifications?skip=${skip}&limit=${limit}`);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId) {
    try {
      return await apiClient.patch(`/api/notifications/${notificationId}/read`, {});
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead() {
    try {
      return await apiClient.patch('/api/notifications/mark-all-read', {});
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId) {
    try {
      return await apiClient.delete(`/api/notifications/${notificationId}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  async deleteAllNotifications() {
    try {
      return await apiClient.delete('/api/notifications/all');
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw error;
    }
  }

  async getSettings() {
    try {
      return await apiClient.get('/api/notifications/settings');
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      throw error;
    }
  }

  async updateSettings(settings) {
    try {
      return await apiClient.put('/api/notifications/settings', settings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();

