import React from 'react';
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

export default function FriendMarker({ friend, onPress }: Props) {
  const emoji = CHARACTER_EMOJIS[friend.character_type ?? ''] ?? '👤';
  const minutesAgo = Math.floor(
    (Date.now() - new Date(friend.last_seen_at).getTime()) / 60000,
  );
  const isRecent = minutesAgo < 5;

  return (
    <Marker
      coordinate={{ latitude: friend.latitude, longitude: friend.longitude }}
      onPress={onPress}
      tracksViewChanges={false}
    >
      <View style={styles.container}>
        <View style={[styles.avatar, isRecent && styles.avatarRecent]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={styles.nameTag}>
          <Text style={styles.name} numberOfLines={1}>
            {friend.username}
          </Text>
        </View>
        {isRecent && <View style={styles.onlineDot} />}
      </View>
    </Marker>
  );
}

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
});
