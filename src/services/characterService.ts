import api from './api';
import type { Character, ApiResponse, CreateCharacterRequest } from '../types';

export const characterService = {
  async create(request: CreateCharacterRequest) {
    const { data } = await api.post<ApiResponse<Character>>('/characters', request);
    return data.data;
  },

  async getMyCharacter() {
    const { data } = await api.get<ApiResponse<Character>>('/characters/me');
    return data.data;
  },

  async updateAppearance(appearance: Record<string, unknown>) {
    const { data } = await api.patch<ApiResponse<Character>>('/characters/me', { appearance });
    return data.data;
  },

  async equipItem(itemId: string) {
    const { data } = await api.patch<ApiResponse<Character>>('/characters/me/equipment', { itemId, action: 'equip' });
    return data.data;
  },

  async unequipItem(itemId: string) {
    const { data } = await api.patch<ApiResponse<Character>>('/characters/me/equipment', { itemId, action: 'unequip' });
    return data.data;
  },
};
