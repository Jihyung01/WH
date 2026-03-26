import api from './api';
import type { InventoryItem, ApiResponse } from '../types';

export const shopService = {
  async getItems() {
    const { data } = await api.get<ApiResponse<InventoryItem[]>>('/shop/items');
    return data.data;
  },

  async purchase(itemId: string) {
    const { data } = await api.post<ApiResponse<InventoryItem>>('/shop/purchase', { itemId });
    return data.data;
  },

  async getSubscriptionStatus() {
    const { data } = await api.get<ApiResponse<{ isActive: boolean; expiresAt: string | null }>>('/shop/subscription/status');
    return data.data;
  },

  async subscribe() {
    const { data } = await api.post<ApiResponse<{ url: string }>>('/shop/subscription');
    return data.data;
  },
};
