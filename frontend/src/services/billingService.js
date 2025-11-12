import { apiClient } from '../api/client';

const billingService = {
  async getPlans() {
    try {
      const response = await apiClient.get('/api/billing/plans');
      return response;
    } catch (error) {
      console.error('Error fetching plans:', error);
      throw error;
    }
  },

  async createCheckoutSession(priceId) {
    try {
      const response = await apiClient.post('/api/billing/create-checkout-session', {
        price_id: priceId,
      });
      return response;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  },

  async getSubscription() {
    try {
      const response = await apiClient.get('/api/billing/subscription');
      return response;
    } catch (error) {
      console.error('Error fetching subscription:', error);
      throw error;
    }
  },

  async getHistory() {
    try {
      const response = await apiClient.get('/api/billing/history');
      return response;
    } catch (error) {
      console.error('Error fetching billing history:', error);
      throw error;
    }
  },

  async createPortalSession() {
    try {
      const response = await apiClient.post('/api/billing/customer-portal', {});
      return response;
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      throw error;
    }
  },
};

export default billingService;


