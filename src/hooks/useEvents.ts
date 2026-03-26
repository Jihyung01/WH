import { useState, useCallback } from 'react';
import { eventService } from '../services/eventService';
import { useLocationStore } from '../stores/locationStore';
import type { Event } from '../types';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentPosition = useLocationStore((s) => s.currentPosition);

  const fetchNearby = useCallback(async (radius = 5000) => {
    if (!currentPosition) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await eventService.getNearby({
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        radius,
      });
      setEvents(data);
    } catch (err) {
      setError('이벤트를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [currentPosition]);

  const fetchTrending = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await eventService.getTrending();
      setEvents(data);
    } catch (err) {
      setError('트렌딩 이벤트를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { events, isLoading, error, fetchNearby, fetchTrending };
}
