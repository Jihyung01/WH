import api from './api';
import type { Reward, ApiResponse } from '../types';

export const rewardService = {
  async getHistory(page = 1) {
    const { data } = await api.get<ApiResponse<Reward[]>>('/rewards/me', { params: { page } });
    return data.data;
  },

  async claim(rewardId: string) {
    const { data } = await api.post<ApiResponse<Reward>>(`/rewards/claim/${rewardId}`);
    return data.data;
  },
};
