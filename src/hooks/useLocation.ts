import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useLocationStore } from '../stores/locationStore';

const MAX_ACCEPTABLE_ACCURACY_M = 120;

async function getFreshPosition(): Promise<Location.LocationObject | null> {
  for (let i = 0; i < 2; i++) {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      const acc = Number(loc.coords.accuracy ?? Infinity);
      if (acc <= MAX_ACCEPTABLE_ACCURACY_M || i === 1) return loc;
    } catch {
      // retry below
    }
  }
  try {
    return await Location.getLastKnownPositionAsync({ maxAge: 30_000 });
  } catch {
    return null;
  }
}

export function useLocation() {
  const { currentPosition, locationPermission, isTracking, setPosition, setPermission, setTracking, setHeading } = useLocationStore();
  const watchSubRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermission(status === 'granted' ? 'granted' : 'denied');
    })();
    return () => {
      if (watchSubRef.current) {
        watchSubRef.current.remove();
        watchSubRef.current = null;
      }
    };
  }, []);

  const ensurePermission = async (): Promise<boolean> => {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === 'granted') {
      setPermission('granted');
      return true;
    }
    const requested = await Location.requestForegroundPermissionsAsync();
    const granted = requested.status === 'granted';
    setPermission(granted ? 'granted' : 'denied');
    return granted;
  };

  const startTracking = async () => {
    const granted = await ensurePermission();
    if (!granted) return;
    if (watchSubRef.current) return;

    setTracking(true);
    watchSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 2,
      },
      (location) => {
        const accuracy = Number(location.coords.accuracy ?? Infinity);
        if (!Number.isFinite(accuracy) || accuracy > 300) {
          // Ignore very noisy points that can jump to another district.
          return;
        }
        setPosition({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (location.coords.heading !== null) {
          setHeading(location.coords.heading);
        }
      }
    );
  };

  const getCurrentPosition = async () => {
    const granted = await ensurePermission();
    if (!granted) return null;
    const location = await getFreshPosition();
    if (!location) return null;
    const point = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    setPosition(point);
    return point;
  };

  return {
    currentPosition,
    locationPermission,
    isTracking,
    startTracking,
    getCurrentPosition,
  };
}
