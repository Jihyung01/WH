import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useLocationStore } from '../stores/locationStore';

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
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 2,
      },
      (location) => {
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
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
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
