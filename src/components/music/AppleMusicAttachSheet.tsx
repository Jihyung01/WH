import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  AppError,
  searchAppleMusicTracks,
  updateCommunitySubmissionMusic,
  type AppleMusicFeedAttachment,
} from '../../lib/api';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, BRAND } from '../../config/theme';

interface Props {
  visible: boolean;
  submissionId: string | null;
  onClose: () => void;
}

export function AppleMusicAttachSheet({ visible, submissionId, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<AppleMusicFeedAttachment[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setTracks([]);
      setLoading(false);
      setErrorText(null);
    }
  }, [visible]);

  const canSearch = query.trim().length >= 2;

  const runSearch = useCallback(async () => {
    if (!canSearch) return;
    setLoading(true);
    setErrorText(null);
    try {
      const list = await searchAppleMusicTracks(query.trim());
      setTracks(list);
      if (list.length === 0) {
        setErrorText('검색 결과가 없어요. 곡명/아티스트를 바꿔서 다시 검색해 주세요.');
      }
    } catch (e) {
      const msg =
        e instanceof AppError
          ? e.message
          : e instanceof Error
            ? e.message
            : null;
      setErrorText(
        msg && (msg.includes('[Apple Music]') || msg.includes('APPLE_MUSIC'))
          ? msg
          : msg && msg.length > 0
            ? msg
            : '검색에 실패했어요. 네트워크 상태를 확인해 주세요.',
      );
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, [canSearch, query]);

  const pickTrack = useCallback(
    async (t: AppleMusicFeedAttachment) => {
      if (!submissionId) return;
      setSavingId(t.apple_song_id);
      try {
        await updateCommunitySubmissionMusic(submissionId, t);
        onClose();
      } catch (e) {
        Alert.alert('오류', '음악 정보를 저장하지 못했어요. 다시 시도해 주세요.');
      } finally {
        setSavingId(null);
      }
    },
    [submissionId, onClose],
  );

  const skip = useCallback(() => {
    onClose();
  }, [onClose]);

  const header = useMemo(
    () => (
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>피드에 곡 붙이기</Text>
        <Text style={styles.sheetSub}>
          Apple Music 카탈로그에서 검색합니다. 미리듣기가 있는 곡은 피드에서 재생할 수 있어요.
        </Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="곡명 또는 아티스트"
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={runSearch}
            returnKeyType="search"
          />
          <Pressable
            style={[styles.searchBtn, !canSearch && styles.searchBtnDisabled]}
            onPress={runSearch}
            disabled={!canSearch || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Ionicons name="search" size={20} color="#FFF" />
            )}
          </Pressable>
        </View>
      </View>
    ),
    [query, canSearch, loading, runSearch],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.dragHint} />
          {header}
          <FlatList
            data={tracks}
            keyExtractor={(item) => item.apple_song_id}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              !loading && canSearch ? (
                <Text style={styles.empty}>
                  {errorText ?? '검색 결과가 없어요.'}
                </Text>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => pickTrack(item)}
                disabled={savingId !== null}
              >
                {item.artwork_url ? (
                  <Image source={{ uri: item.artwork_url }} style={styles.rowArt} />
                ) : (
                  <View style={[styles.rowArt, styles.rowArtPh]}>
                    <Ionicons name="musical-note" size={18} color={COLORS.textMuted} />
                  </View>
                )}
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowArtist} numberOfLines={1}>
                    {item.artist}
                  </Text>
                </View>
                {savingId === item.apple_song_id ? (
                  <ActivityIndicator size="small" color={BRAND.primary} />
                ) : (
                  <Ionicons name="add-circle-outline" size={24} color={BRAND.primary} />
                )}
              </Pressable>
            )}
          />
          <Pressable style={styles.skipBtn} onPress={skip}>
            <Text style={styles.skipText}>나중에 · 곡 없이 올리기</Text>
          </Pressable>
          <Pressable style={styles.closeFab} onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={COLORS.textSecondary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '88%',
    paddingBottom: SPACING.xl,
  },
  dragHint: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sheetHeader: {
    paddingHorizontal: SPACING.lg,
  },
  sheetTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  sheetSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    lineHeight: 18,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  searchBtn: {
    backgroundColor: BRAND.primary,
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: {
    opacity: 0.5,
  },
  list: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    maxHeight: 360,
  },
  empty: {
    textAlign: 'center',
    color: COLORS.textMuted,
    paddingVertical: SPACING.xl,
    fontSize: FONT_SIZE.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowArt: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  rowArtPh: {
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  rowArtist: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  skipText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  closeFab: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
  },
});
