import { useState, useCallback } from 'react';
import { useLocationStore } from '../stores/locationStore';
import { checkinService } from '../services/checkinService';
import { getDistance } from '../utils/geo';
import type { GeoPoint, CheckIn } from '../types';

const CHECK_IN_RADIUS = 100; // meters

export function useCheckIn(eventId: string, eventLocation: GeoPoint) {
  const [isChecking, setIsChecking] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentPosition = useLocationStore((s) => s.currentPosition);

  const updateDistance = useCallback(() => {
    if (!currentPosition) return;
    const d = getDistance(currentPosition, eventLocation);
    setDistance(Math.round(d));
    return d;
  }, [currentPosition, eventLocation]);

  const isWithinRadius = distance !== null && distance <= CHECK_IN_RADIUS;

  const performCheckIn = async (): Promise<CheckIn | null> => {
    if (!currentPosition) {
      setError('위치를 확인할 수 없습니다');
      return null;
    }

    setIsChecking(true);
    setError(null);

    try {
      const result = await checkinService.create({
        eventId,
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
      });
      return result;
    } catch (err) {
      setError('체크인에 실패했습니다. 다시 시도해주세요.');
      return null;
    } finally {
      setIsChecking(false);
    }
  };

  return {
    distance,
    isWithinRadius,
    isChecking,
    error,
    updateDistance,
    performCheckIn,
  };
}
