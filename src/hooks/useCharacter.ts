import { useCallback } from 'react';
import { useCharacterStore } from '../stores/characterStore';
import { characterService } from '../services/characterService';
import type { CreateCharacterRequest } from '../types';

export function useCharacter() {
  const { character, isLoading, setCharacter, addXp, setLoading } = useCharacterStore();

  const fetchCharacter = useCallback(async () => {
    setLoading(true);
    try {
      const data = await characterService.getMyCharacter();
      setCharacter(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCharacter = useCallback(async (request: CreateCharacterRequest) => {
    setLoading(true);
    try {
      const data = await characterService.create(request);
      setCharacter(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const gainXp = useCallback((xp: number) => {
    addXp(xp);
  }, []);

  return { character, isLoading, fetchCharacter, createCharacter, gainXp };
}
