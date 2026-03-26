import api from './api';
import type { Event, ApiResponse, PaginatedResponse, NearbyEventsRequest } from '../types';

export interface GeneratedQuiz {
  question: string;
  options: string[];
  correctIndex: number;
}

export const eventService = {
  async getNearby(params: NearbyEventsRequest) {
    const { data } = await api.get<ApiResponse<Event[]>>('/events/nearby', { params });
    return data.data;
  },

  async getById(id: string) {
    const { data } = await api.get<ApiResponse<Event>>(`/events/${id}`);
    return data.data;
  },

  async getList(params?: { district?: string; category?: string; status?: string; page?: number }) {
    const { data } = await api.get<ApiResponse<PaginatedResponse<Event>>>('/events', { params });
    return data.data;
  },

  async getTrending() {
    const { data } = await api.get<ApiResponse<Event[]>>('/events/trending');
    return data.data;
  },

  async search(query: string) {
    const { data } = await api.get<ApiResponse<Event[]>>('/events/search', { params: { q: query } });
    return data.data;
  },

  async getNarrative(eventId: string) {
    const { data } = await api.get<ApiResponse<{ narrative: string }>>(`/events/${eventId}/narrative`);
    return data.data.narrative;
  },

  /**
   * Requests Claude-generated narrative via FastAPI backend.
   * POST /api/events/{event_id}/narrative
   */
  async generateNarrative(eventId: string) {
    const { data } = await api.post<ApiResponse<{ narrative: string }>>(
      `/events/${eventId}/narrative`,
    );
    return data.data.narrative;
  },

  /**
   * Requests Claude-generated quiz via FastAPI backend.
   * POST /api/events/{event_id}/generate-quiz
   */
  async generateQuiz(eventId: string): Promise<GeneratedQuiz> {
    const { data } = await api.post<ApiResponse<GeneratedQuiz>>(
      `/events/${eventId}/generate-quiz`,
    );
    return data.data;
  },
};
