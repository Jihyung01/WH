import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  Modal,
  FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import type { CreateMarkResult, MarkMusicAttachment, MarkVisibility } from '../../types/models';
import {
  searchAppleMusicTracks,
  type AppleMusicFeedAttachment,
} from '../../lib/api';
import { useMarkStore } from '../../stores/markStore';
import { useTheme } from '../../providers/ThemeProvider';
import {
  BRAND,
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  SHADOWS,
} from '../../config/theme';
import { fireImpactMedium, fireNotificationSuccess } from '../../utils/hapticsSafe';
import { captureError } from '../../utils/errorReporting';

const EMOJI_OPTIONS = ['📍', '🌟', '💫', '🔥', '❤️', '🎵', '☕', '🍜', '🌿', '📸'] as const;
const VISIBILITY_OPTIONS: { value: MarkVisibility; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'public', label: '공개', icon: 'earth' },
  { value: 'friends', label: '친구', icon: 'people' },
  { value: 'private', label: '나만', icon: 'lock-closed' },
];

export interface CreateMarkSheetHandle {
  open: () => void;
  close: () => void;
}

interface Props {
  coords: { latitude: number; longitude: number } | null;
  district?: string | null;
  onCreated?: (result: CreateMarkResult) => void;
}

export const CreateMarkSheet = forwardRef<CreateMarkSheetHandle, Props>(
  function CreateMarkSheetInner({ coords, district, onCreated }, ref) {
    const { colors } = useTheme();
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['60%', '92%'], []);

    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [emoji, setEmoji] = useState<string>('📍');
    const [visibility, setVisibility] = useState<MarkVisibility>('public');
    const [music, setMusic] = useState<MarkMusicAttachment | null>(null);
    const [musicPickerOpen, setMusicPickerOpen] = useState(false);

    const isCreating = useMarkStore((s) => s.isCreating);
    const createMark = useMarkStore((s) => s.createMark);

    const reset = useCallback(() => {
      setPhotoUri(null);
      setText('');
      setEmoji('📍');
      setVisibility('public');
      setMusic(null);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          sheetRef.current?.snapToIndex(0);
        },
        close: () => {
          sheetRef.current?.close();
        },
      }),
      [],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      ),
      [],
    );

    const pickFromAlbum = useCallback(async () => {
      try {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요해요.');
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 5],
        });
        if (!res.canceled && res.assets[0]) {
          fireImpactMedium();
          setPhotoUri(res.assets[0].uri);
        }
      } catch (err) {
        captureError(err, { tag: 'CreateMarkSheet.pickFromAlbum' });
      }
    }, []);

    const pickFromCamera = useCallback(async () => {
      try {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('권한 필요', '카메라 접근 권한이 필요해요.');
          return;
        }
        const res = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 5],
        });
        if (!res.canceled && res.assets[0]) {
          fireImpactMedium();
          setPhotoUri(res.assets[0].uri);
        }
      } catch (err) {
        captureError(err, { tag: 'CreateMarkSheet.pickFromCamera' });
      }
    }, []);

    const handlePickPhoto = useCallback(() => {
      Alert.alert(
        '사진 추가',
        '흔적에 남길 사진을 선택해주세요.',
        [
          { text: '앨범에서 선택', onPress: () => void pickFromAlbum() },
          { text: '사진 촬영', onPress: () => void pickFromCamera() },
          { text: '취소', style: 'cancel' },
        ],
      );
    }, [pickFromAlbum, pickFromCamera]);

    const canSubmit =
      !!coords &&
      !!photoUri &&
      text.trim().length > 0 &&
      text.trim().length <= 200 &&
      !isCreating;

    const handleSubmit = useCallback(async () => {
      if (!coords || !photoUri) {
        Alert.alert('입력 확인', '사진과 위치가 필요해요.');
        return;
      }
      const trimmed = text.trim();
      if (trimmed.length === 0 || trimmed.length > 200) {
        Alert.alert('입력 확인', '내용은 1자 이상 200자 이하로 입력해주세요.');
        return;
      }

      try {
        fireImpactMedium();
        const result = await createMark(
          {
            content: trimmed,
            emoji_icon: emoji,
            lat: coords.latitude,
            lng: coords.longitude,
            visibility,
            district: district ?? undefined,
            music_json: music,
          },
          photoUri,
        );
        fireNotificationSuccess();
        reset();
        sheetRef.current?.close();
        onCreated?.(result);

        // 흔적 ≥3 도달 → 일지 자동 생성 제안 (스펙: 토스트/알림 → 탭 → journal.tsx 진입)
        if (result?.should_generate_journal) {
          // 시트 close 애니메이션과 겹치지 않도록 살짝 지연
          setTimeout(() => {
            Alert.alert(
              '오늘의 탐험 일지가 준비됐어요!',
              '지금 확인할까요?',
              [
                { text: '나중에', style: 'cancel' },
                {
                  text: '확인하기',
                  onPress: () => {
                    router.push('/journal?auto=1');
                  },
                },
              ],
              { cancelable: true },
            );
          }, 300);
        }
      } catch (err) {
        captureError(err, { tag: 'CreateMarkSheet.submit' });
        const msg = err instanceof Error ? err.message : '흔적 저장에 실패했어요.';
        Alert.alert('오류', msg);
      }
    }, [coords, photoUri, text, emoji, visibility, district, music, createMark, onCreated, reset]);

    return (
      <>
        <BottomSheet
          ref={sheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: colors.surface }}
          handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
        >
          <BottomSheetScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>흔적 남기기</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              지금 이 순간, 이곳에 흔적을 남겨요
            </Text>

            {/* 사진 영역 */}
            <Pressable
              style={[
                styles.photoBox,
                { backgroundColor: colors.surfaceLight, borderColor: colors.border },
              ]}
              onPress={handlePickPhoto}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera" size={40} color={colors.textMuted} />
                  <Text style={[styles.photoHint, { color: colors.textMuted }]}>
                    사진을 선택해주세요
                  </Text>
                </View>
              )}
            </Pressable>

            {/* 텍스트 입력 */}
            <View
              style={[
                styles.textBox,
                { backgroundColor: colors.surfaceLight, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
                placeholder="이 순간을 짧게 적어주세요 (최대 200자)"
                placeholderTextColor={colors.textMuted}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={200}
              />
              <Text style={[styles.counter, { color: colors.textMuted }]}>
                {text.length}/200
              </Text>
            </View>

            {/* 이모지 선택 */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                이모지
              </Text>
              <View style={styles.emojiRow}>
                {EMOJI_OPTIONS.map((e) => {
                  const selected = e === emoji;
                  return (
                    <Pressable
                      key={e}
                      onPress={() => {
                        setEmoji(e);
                        fireImpactMedium();
                      }}
                      style={[
                        styles.emojiBtn,
                        {
                          backgroundColor: selected ? BRAND.primary + '22' : colors.surfaceLight,
                          borderColor: selected ? BRAND.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={styles.emojiChar}>{e}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 음악 첨부 */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                음악 첨부 (선택)
              </Text>
              {music ? (
                <View
                  style={[
                    styles.musicBox,
                    { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                  ]}
                >
                  {music.artwork_url ? (
                    <Image source={{ uri: music.artwork_url }} style={styles.musicArt} />
                  ) : (
                    <View style={[styles.musicArt, { backgroundColor: colors.surfaceHighlight }]}>
                      <Ionicons name="musical-notes" size={20} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.musicText}>
                    <Text
                      style={[styles.musicTitle, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {music.title}
                    </Text>
                    <Text
                      style={[styles.musicArtist, { color: colors.textMuted }]}
                      numberOfLines={1}
                    >
                      {music.artist}
                    </Text>
                  </View>
                  <Pressable onPress={() => setMusic(null)} style={styles.musicRemove}>
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[
                    styles.musicAddBtn,
                    { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                  ]}
                  onPress={() => setMusicPickerOpen(true)}
                >
                  <Ionicons name="musical-notes-outline" size={18} color={BRAND.primary} />
                  <Text style={[styles.musicAddText, { color: colors.textPrimary }]}>
                    Apple Music에서 곡 찾기
                  </Text>
                </Pressable>
              )}
            </View>

            {/* 공개 범위 */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>공개 범위</Text>
              <View style={styles.visibilityRow}>
                {VISIBILITY_OPTIONS.map((opt) => {
                  const selected = opt.value === visibility;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        setVisibility(opt.value);
                        fireImpactMedium();
                      }}
                      style={[
                        styles.visibilityBtn,
                        {
                          backgroundColor: selected ? BRAND.primary + '22' : colors.surfaceLight,
                          borderColor: selected ? BRAND.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={16}
                        color={selected ? BRAND.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.visibilityText,
                          { color: selected ? BRAND.primary : colors.textPrimary },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 제출 버튼 */}
            <Pressable
              onPress={() => void handleSubmit()}
              disabled={!canSubmit}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: canSubmit ? BRAND.primary : colors.surfaceHighlight,
                  opacity: canSubmit ? 1 : 0.6,
                },
              ]}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>흔적 남기기</Text>
              )}
            </Pressable>
          </BottomSheetScrollView>
        </BottomSheet>

        <MusicPickerModal
          visible={musicPickerOpen}
          onClose={() => setMusicPickerOpen(false)}
          onPick={(m) => {
            setMusic(m);
            setMusicPickerOpen(false);
          }}
        />
      </>
    );
  },
);

/* ──────────────────────────────────────────────── */
/* Music picker — inline modal reusing apple-music-search edge fn */
/* ──────────────────────────────────────────────── */

function MusicPickerModal({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (music: MarkMusicAttachment) => void;
}) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AppleMusicFeedAttachment[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) return;
    setLoading(true);
    try {
      const list = await searchAppleMusicTracks(q);
      setResults(Array.isArray(list) ? list : []);
    } catch (err) {
      captureError(err, { tag: 'MusicPickerModal.search' });
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}
      >
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Apple Music 검색
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View
            style={[
              styles.searchRow,
              { backgroundColor: colors.surfaceLight, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="곡명, 아티스트 검색"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={() => void runSearch()}
            />
            <Pressable onPress={() => void runSearch()} hitSlop={6}>
              <Text style={{ color: BRAND.primary, fontWeight: FONT_WEIGHT.semibold }}>검색</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={BRAND.primary} style={{ marginTop: SPACING.lg }} />
          ) : (
            <FlatList
              data={results}
              keyExtractor={(it) => it.apple_song_id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.resultList}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => onPick(item)}
                  style={[styles.resultRow, { borderBottomColor: colors.border }]}
                >
                  {item.artwork_url ? (
                    <Image source={{ uri: item.artwork_url }} style={styles.resultArt} />
                  ) : (
                    <View
                      style={[styles.resultArt, { backgroundColor: colors.surfaceHighlight }]}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.resultTitle, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[styles.resultArtist, { color: colors.textMuted }]}
                      numberOfLines={1}
                    >
                      {item.artist}
                    </Text>
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={
                query.trim().length >= 2 && !loading ? (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    결과가 없어요.
                  </Text>
                ) : null
              }
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.sm,
  },
  photoBox: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  photoHint: {
    fontSize: FONT_SIZE.sm,
  },
  textBox: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.md,
    minHeight: 100,
  },
  textInput: {
    fontSize: FONT_SIZE.md,
    lineHeight: 22,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: FONT_SIZE.xs,
    marginTop: 4,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiChar: {
    fontSize: 20,
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  visibilityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  visibilityText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  musicBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.sm,
  },
  musicArt: {
    width: 40,
    height: 40,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicText: {
    flex: 1,
    minWidth: 0,
  },
  musicTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  musicArtist: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  musicRemove: {
    padding: 4,
  },
  musicAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  musicAddText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  submitBtn: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '80%',
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.md,
  },
  resultList: {
    paddingVertical: SPACING.sm,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultArt: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  resultTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  resultArtist: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: SPACING.xl,
    fontSize: FONT_SIZE.sm,
  },
});
