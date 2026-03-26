import api from './api';
import type { CheckIn, ApiResponse, CheckInRequest } from '../types';

export const checkinService = {
  async create(request: CheckInRequest) {
    const { data } = await api.post<ApiResponse<CheckIn>>('/checkins', request);
    return data.data;
  },

  async verify(eventId: string, latitude: number, longitude: number) {
    const { data } = await api.get<ApiResponse<{ isValid: boolean; distance: number }>>(
      '/checkins/verify',
      { params: { eventId, lat: latitude, lng: longitude } }
    );
    return data.data;
  },

  async getHistory(page = 1) {
    const { data } = await api.get<ApiResponse<CheckIn[]>>('/checkins/me', { params: { page } });
    return data.data;
  },

  async getToday() {
    const { data } = await api.get<ApiResponse<CheckIn[]>>('/checkins/me/today');
    return data.data;
  },
};
