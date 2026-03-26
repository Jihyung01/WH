import { useEffect } from 'react';
import * as Location from 'expo-location';
import { useLocationStore } from '../stores/locationStore';

export function useLocation() {
  const { currentPosition, locationPermission, isTracking, setPosition, setPermission, setTracking, setHeading } = useLocationStore();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermission(status === 'granted' ? 'granted' : 'denied');
    })();
  }, []);

  const startTracking = async () => {
    if (locationPermission !== 'granted') return;

    setTracking(true);
    await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 5,
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
    if (locationPermission !== 'granted') return null;
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
