import { apiClient } from '../api/client';

class DashboardService {
  async getDashboardStats(timeRange = '30d') {
    try {
      return await apiClient.get(`/api/dashboard/stats?time_range=${timeRange}`);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  async getSpendingGraph(timeRange = '7d') {
    try {
      return await apiClient.get(`/api/dashboard/graphs/spending?time_range=${timeRange}`);
    } catch (error) {
      console.error('Error fetching spending graph:', error);
      throw error;
    }
  }

  async getSuccessRateGraph(timeRange = '7d') {
    try {
      return await apiClient.get(`/api/dashboard/graphs/success-rate?time_range=${timeRange}`);
    } catch (error) {
      console.error('Error fetching success rate graph:', error);
      throw error;
    }
  }

  async getCostGraph(timeRange = '7d') {
    try {
      return await apiClient.get(`/api/dashboard/graphs/cost?time_range=${timeRange}`);
    } catch (error) {
      console.error('Error fetching cost graph:', error);
      throw error;
    }
  }

  async getWrappedAPIs() {
    try {
      return await apiClient.get('/api/dashboard/wrapped-apis');
    } catch (error) {
      console.error('Error fetching wrapped APIs:', error);
      throw error;
    }
  }
}

export const dashboardService = new DashboardService();

