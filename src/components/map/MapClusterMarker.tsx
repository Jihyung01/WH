import React, { memo, useEffect, useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  InteractionManager,
} from 'react-native';
import { Marker } from 'react-native-maps';

/** Mirrors `react-native-map-clustering/lib/helpers` returnMarkerStyle (keep in sync on lib upgrade). */
function getClusterDimensions(points: number): {
  width: number;
  height: number;
  size: number;
  fontSize: number;
} {
  if (points >= 50) return { width: 84, height: 84, size: 64, fontSize: 20 };
  if (points >= 25) return { width: 78, height: 78, size: 58, fontSize: 19 };
  if (points >= 15) return { width: 72, height: 72, size: 54, fontSize: 18 };
  if (points >= 10) return { width: 66, height: 66, size: 50, fontSize: 17 };
  if (points >= 8) return { width: 60, height: 60, size: 46, fontSize: 17 };
  if (points >= 4) return { width: 54, height: 54, size: 40, fontSize: 16 };
  return { width: 48, height: 48, size: 36, fontSize: 15 };
}

const ANDROID_SCALE = 1.06;
const ANDROID_PAD = 3;

export interface MapClusterMarkerProps {
  id: number;
  geometry: { coordinates: [number, number] };
  properties: { point_count: number };
  onPress: () => void;
  clusterColor: string;
  clusterTextColor: string;
  clusterFontFamily?: string;
}

function MapClusterMarkerInner({
  id,
  geometry,
  properties,
  onPress,
  clusterColor,
  clusterTextColor,
  clusterFontFamily,
}: MapClusterMarkerProps): React.ReactElement {
  const points = properties.point_count;
  const base = getClusterDimensions(points);
  const isAndroid = Platform.OS === 'android';
  const width = isAndroid ? Math.round(base.width * ANDROID_SCALE) : base.width;
  const height = isAndroid ? Math.round(base.height * ANDROID_SCALE) : base.height;
  const size = isAndroid ? Math.round(base.size * ANDROID_SCALE) : base.size;
  const fontSize = isAndroid ? Math.round(base.fontSize * ANDROID_SCALE) : base.fontSize;

  const [tracksViewChanges, setTracksViewChanges] = useState(isAndroid);

  useEffect(() => {
    if (!isAndroid) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        if (!cancelled) setTracksViewChanges(false);
      }, 480);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isAndroid, id]);

  return (
    <Marker
      coordinate={{
        longitude: geometry.coordinates[0],
        latitude: geometry.coordinates[1],
      }}
      style={{ zIndex: points + 1 }}
      onPress={onPress}
      tracksViewChanges={tracksViewChanges}
    >
      <View
        style={[styles.outer, isAndroid && { padding: ANDROID_PAD }]}
        collapsable={false}
      >
        <TouchableOpacity
          activeOpacity={0.5}
          style={[styles.container, { width, height }]}
        >
          <View
            style={[
              styles.wrapper,
              {
                backgroundColor: clusterColor,
                width,
                height,
                borderRadius: width / 2,
              },
            ]}
          />
          <View
            style={[
              styles.cluster,
              {
                backgroundColor: clusterColor,
                width: size,
                height: size,
                borderRadius: size / 2,
              },
            ]}
          >
            <Text
              style={[
                styles.text,
                {
                  color: clusterTextColor,
                  fontSize,
                  fontFamily: clusterFontFamily,
                },
                isAndroid && styles.textAndroid,
              ]}
            >
              {points}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wrapper: {
    position: 'absolute',
    opacity: 0.5,
    zIndex: 0,
  },
  cluster: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  text: {
    fontWeight: 'bold',
  },
  textAndroid: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export const MapClusterMarker = memo(MapClusterMarkerInner);
