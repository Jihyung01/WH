import React, { memo, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  InteractionManager,
  type ImageRequireSource,
} from 'react-native';
import { Marker } from 'react-native-maps';
import type { FriendLocation } from '../../services/friendLocation';

const IS_ANDROID = Platform.OS === 'android';
const ANDROID_FRIEND_MARKER_RECENT = require('../../../assets/map-markers/friend-marker-recent.png');
const ANDROID_FRIEND_MARKER_STALE = require('../../../assets/map-markers/friend-marker-stale.png');

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

  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    InteractionManager.runAfterInteractions(() => {
      const delayMs = IS_ANDROID ? 520 : 160;
      timer = setTimeout(() => {
        if (!cancelled) setTracksViewChanges(false);
      }, delayMs);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [friend.user_id]);

  if (IS_ANDROID) {
    const image: ImageRequireSource = isRecent
      ? ANDROID_FRIEND_MARKER_RECENT
      : ANDROID_FRIEND_MARKER_STALE;

    return (
      <MarkerComponent
        coordinate={coordinate}
        identifier={`friend-${friend.user_id}`}
        cluster={false}
        zIndex={2000}
        onPress={onPress}
        tracksViewChanges={false}
        image={image}
        anchor={{ x: 0.5, y: 0.91 }}
      />
    );
  }

  // iOS: manga 톤 친구 마커 — 한글 이니셜 + 자동 색 + 잉크 외곽선 + 종이 이름태그.
  // Android 는 위 PNG 로 처리되어 이 분기 안 탐.
  const initial = (friend.username ?? '?')[0]?.toUpperCase() ?? '?';
  const cp = friend.username ? friend.username.codePointAt(0) ?? 0 : 0;
  const accent = MANGA_FRIEND_PALETTE[cp % MANGA_FRIEND_PALETTE.length];

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
        {/* avatar — 컬러 원 + 잉크 외곽선 + hard shadow */}
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarShadow, { top: 2, left: 2 }]} />
          <View style={[styles.avatarBody, { backgroundColor: accent }]}>
            <Text style={styles.avatarInitial} allowFontScaling={false} numberOfLines={1}>
              {initial}
            </Text>
          </View>
        </View>

        {/* 이름 태그 — 잉크 + 종이 글씨 */}
        <View style={styles.nameTag}>
          <Text style={styles.name} allowFontScaling={false} numberOfLines={1}>
            {friend.username}
          </Text>
        </View>

        {/* 온라인 dot */}
        {isRecent ? (
          <View style={styles.onlineDot} />
        ) : null}
      </View>
    </MarkerComponent>
  );
}

// 한글 이니셜 → 컬러 매핑 (manga 7색)
const MANGA_FRIEND_PALETTE = [
  '#FFD93D', '#3DDC97', '#FF6B9A',
  '#4FBDFF', '#FFB84D', '#C5A6FF',
  '#FF6B6B',
];

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
    minHeight: IS_ANDROID ? 56 : 60,
    paddingBottom: IS_ANDROID ? 4 : 2,
  },
  // ── manga avatar (iOS) ──
  avatarWrap: {
    width: 38,
    height: 38,
    position: 'relative',
  },
  avatarShadow: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1A1612',
  },
  avatarBody: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2.5,
    borderColor: '#1A1612',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#1A1612',
    fontSize: 16,
    fontWeight: '900',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  // ── manga 이름 태그 ──
  nameTag: {
    backgroundColor: '#1A1612',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
    maxWidth: 96,
  },
  name: {
    color: '#FFD93D',     // 노랑 manga
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.2,
    ...(IS_ANDROID ? { includeFontPadding: false } : {}),
  },
  // ── 온라인 dot (manga 초록 + 잉크 외곽선) ──
  onlineDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3DDC97',
    borderWidth: 2,
    borderColor: '#1A1612',
  },
});
