import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { COLORS, BRAND } from '../../config/theme';
import type { FriendLocation } from '../../services/friendLocation';

const CHARACTER_EMOJIS: Record<string, string> = {
  explorer: '🌿',
  foodie: '🔭',
  artist: '📚',
  socialite: '⭐',
};

interface Props {
  friend: FriendLocation;
  onPress?: () => void;
}

function FriendMarkerInner({ friend, onPress }: Props) {
  const MarkerComponent = Marker as unknown as React.ComponentType<Record<string, unknown>>;
  const latitude = Number(friend.latitude);
  const longitude = Number(friend.longitude);
  const emoji = CHARACTER_EMOJIS[friend.character_type ?? ''] ?? '👤';
  const isRecent = useMemo(() => {
    const ms = Date.now() - new Date(friend.last_seen_at).getTime();
    return Number.isFinite(ms) && ms >= 0 && ms < 5 * 60 * 1000;
  }, [friend.last_seen_at]);

  const coordinate = useMemo(
    () => ({ latitude, longitude }),
    [latitude, longitude],
  );

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return (
    <MarkerComponent
      coordinate={coordinate}
      identifier={`friend-${friend.user_id}`}
      cluster={false}
      zIndex={2000}
      onPress={onPress}
      tracksViewChanges={false}
    >
      <View style={styles.container} collapsable={false}>
        <View style={[styles.avatar, isRecent && styles.avatarRecent]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={styles.nameTag}>
          <Text style={styles.name} numberOfLines={1}>
            {friend.username}
          </Text>
        </View>
        <View style={[styles.onlineDot, !isRecent && styles.onlineDotHidden]} />
      </View>
    </MarkerComponent>
  );
}

export default memo(FriendMarkerInner, (prev, next) => {
  if (prev.onPress !== next.onPress) return false;
  const a = prev.friend;
  const b = next.friend;
  return (
    a.user_id === b.user_id &&
    a.latitude === b.latitude &&
    a.longitude === b.longitude &&
    a.last_seen_at === b.last_seen_at &&
    a.username === b.username &&
    a.character_type === b.character_type
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRecent: {
    borderColor: BRAND.primary,
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  emoji: {
    fontSize: 18,
  },
  nameTag: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    maxWidth: 80,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  onlineDot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  onlineDotHidden: {
    opacity: 0,
  },
});
