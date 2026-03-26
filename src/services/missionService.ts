import api from './api';
import type { Mission, ApiResponse } from '../types';

export const missionService = {
  async getAvailable() {
    const { data } = await api.get<ApiResponse<Mission[]>>('/missions/available');
    return data.data;
  },

  async getActive() {
    const { data } = await api.get<ApiResponse<Mission[]>>('/missions/active');
    return data.data;
  },

  async getById(id: string) {
    const { data } = await api.get<ApiResponse<Mission>>(`/missions/${id}`);
    return data.data;
  },

  async start(missionId: string) {
    const { data } = await api.post<ApiResponse<Mission>>(`/missions/${missionId}/start`);
    return data.data;
  },

  async updateProgress(missionId: string, objectiveId: string, value: number) {
    const { data } = await api.patch<ApiResponse<Mission>>(`/missions/${missionId}/progress`, {
      objectiveId,
      currentValue: value,
    });
    return data.data;
  },

  async complete(missionId: string) {
    const { data } = await api.post<ApiResponse<Mission>>(`/missions/${missionId}/complete`);
    return data.data;
  },

  async getDaily() {
    const { data } = await api.get<ApiResponse<Mission[]>>('/missions/daily');
    return data.data;
  },

  async getWeekly() {
    const { data } = await api.get<ApiResponse<Mission[]>>('/missions/weekly');
    return data.data;
  },
};
