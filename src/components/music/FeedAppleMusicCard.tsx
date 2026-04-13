import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import type { AppleMusicFeedAttachment } from '../../lib/api';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, BRAND } from '../../config/theme';

interface Props {
  music: AppleMusicFeedAttachment;
}

export function FeedAppleMusicCard({ music }: Props) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const preview = music.preview_url;
  const canPreview = typeof preview === 'string' && preview.length > 8;

  useEffect(() => {
    return () => {
      void sound?.unloadAsync();
    };
  }, [sound]);

  const togglePreview = useCallback(async () => {
    if (!canPreview || !preview) return;
    try {
      if (sound) {
        const st = await sound.getStatusAsync();
        if (st.isLoaded && st.isPlaying) {
          await sound.pauseAsync();
          setPlaying(false);
          return;
        }
        if (st.isLoaded && !st.isPlaying) {
          await sound.replayAsync();
          setPlaying(true);
          return;
        }
      }
      setLoading(true);
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const { sound: s } = await Audio.Sound.createAsync(
        { uri: preview },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && 'didJustFinish' in status && status.didJustFinish) {
            setPlaying(false);
          }
        },
      );
      setSound(s);
      setPlaying(true);
    } catch (e) {
      console.warn('Preview playback failed:', e);
    } finally {
      setLoading(false);
    }
  }, [canPreview, preview, sound]);

  const openInAppleMusic = useCallback(() => {
    const u = music.apple_music_url;
    if (u) void Linking.openURL(u);
  }, [music.apple_music_url]);

  return (
    <View style={styles.wrap}>
      {music.artwork_url ? (
        <Image source={{ uri: music.artwork_url }} style={styles.art} contentFit="cover" />
      ) : (
        <View style={[styles.art, styles.artPlaceholder]}>
          <Ionicons name="musical-notes" size={28} color={COLORS.textMuted} />
        </View>
      )}
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {music.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {music.artist}
        </Text>
        <Text style={styles.badge}>Apple Music</Text>
      </View>
      <View style={styles.actions}>
        {canPreview ? (
          <Pressable
            style={[styles.iconBtn, loading && styles.iconBtnDisabled]}
            onPress={togglePreview}
            disabled={loading}
            hitSlop={8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={BRAND.primary} />
            ) : (
              <Ionicons name={playing ? 'pause' : 'play'} size={22} color={BRAND.primary} />
            )}
          </Pressable>
        ) : null}
        {music.apple_music_url ? (
          <Pressable style={styles.iconBtn} onPress={openInAppleMusic} hitSlop={8}>
            <Ionicons name="open-outline" size={20} color={COLORS.textSecondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  art: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surface,
  },
  artPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  artist: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  badge: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: FONT_WEIGHT.medium,
    color: BRAND.primary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 8,
  },
  iconBtnDisabled: {
    opacity: 0.6,
  },
});
