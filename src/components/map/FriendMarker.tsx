import React, { memo, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  InteractionManager,
} from 'react-native';
import { Marker } from 'react-native-maps';
import { COLORS, BRAND } from '../../config/theme';
import type { FriendLocation } from '../../services/friendLocation';
import { CharacterAvatar } from '../character/CharacterAvatar';

const IS_ANDROID = Platform.OS === 'android';

interface Props {
  friend: FriendLocation;
  onPress?: () => void;
}

function FriendMarkerInner({ friend, onPress }: Props) {
  const latitude = Number(friend.latitude);
  const longitude = Number(friend.longitude);
  const characterType = friend.character_type ?? 'explorer';
  const characterLevel = friend.level ?? 1;
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
    <FriendMarkerContent
      coordinate={coordinate}
      friend={friend}
      onPress={onPress}
    />
  );
}

function FriendMarkerContent({
  coordinate,
  friend,
  onPress,
}: {
  coordinate: { latitude: number; longitude: number };
  friend: FriendLocation;
  onPress?: () => void;
}): React.ReactElement {
  const MarkerComponent = Marker as unknown as React.ComponentType<Record<string, unknown>>;
  const characterType = friend.character_type ?? 'explorer';
  const characterLevel = friend.level ?? 1;
  const isRecent = useMemo(() => {
    const ms = Date.now() - new Date(friend.last_seen_at).getTime();
    return Number.isFinite(ms) && ms >= 0 && ms < 5 * 60 * 1000;
  }, [friend.last_seen_at]);

  const [tracksViewChanges, setTracksViewChanges] = useState(IS_ANDROID);

  useEffect(() => {
    if (!IS_ANDROID) return;
    let cancelled = false;
    InteractionManager.runAfterInteractions(() => {
      if (!cancelled) setTracksViewChanges(false);
    });
    return () => {
      cancelled = true;
    };
  }, [friend.user_id]);

  return (
    <MarkerComponent
      coordinate={coordinate}
      identifier={`friend-${friend.user_id}`}
      cluster={false}
      zIndex={2000}
      onPress={onPress}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={styles.container} collapsable={false}>
        <View style={[styles.avatar, isRecent && styles.avatarRecent]}>
          <CharacterAvatar
            characterType={characterType}
            level={characterLevel}
            size={32}
            showLoadoutOverlay={false}
            interactive={false}
            borderColor={isRecent ? BRAND.primary : COLORS.surfaceLight}
            backgroundColor={COLORS.surface}
          />
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
    a.character_type === b.character_type &&
    a.level === b.level
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    overflow: 'visible',
    minWidth: IS_ANDROID ? 88 : 82,
    minHeight: IS_ANDROID ? 56 : 52,
    paddingBottom: IS_ANDROID ? 4 : 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRecent: {
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
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
    ...(IS_ANDROID ? { includeFontPadding: false } : {}),
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
