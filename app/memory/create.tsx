/**
 * 새 장소 메모리 작성 화면 (Phase 7 — minimal MVP).
 *
 * Spec §5.2 — 폴라로이드 카드.
 * 본 화면 MVP: 제목·이모지·날짜만 받아 RPC create_place_memory 호출.
 * 사진 업로드는 Phase 7.5 에서 expo-image-picker + Storage.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { createPlaceMemory } from '../../src/lib/api';
import { MANGA, FONT_FAMILY } from '../../src/config/theme';
import { InkCard, InkButton, MangaChip, showToast } from '../../src/components/ui';

const EMOJIS = ['🌅', '☕', '🌸', '🍜', '🎨', '🌳', '🎵', '🍰', '🌙', '✨'];

export default function MemoryCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState<string>(EMOJIS[0]);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('제목', '메모리 제목을 적어주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await createPlaceMemory({
        title: title.trim(),
        emoji,
      });
      showToast('메모리 저장됨', { tone: 'success', icon: '✦' });
      router.back();
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={MANGA.ink} />
        </Pressable>
        <Text style={styles.h1} allowFontScaling={false}>새 메모리</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
      >
        <InkCard radius="cardLg" shadow="md" pad={{ v: 14, h: 14 }}>
          <Text style={styles.fieldLabel} allowFontScaling={false}>제목</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="예: 노을이 예쁘던 날"
            placeholderTextColor="rgba(26,22,18,0.4)"
            style={styles.titleInput}
            allowFontScaling={false}
            maxLength={40}
          />
        </InkCard>

        <View style={{ marginTop: 12 }}>
          <Text style={[styles.fieldLabel, { paddingHorizontal: 4 }]} allowFontScaling={false}>
            기분 / 분위기
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {EMOJIS.map((e) => (
              <Pressable key={e} onPress={() => setEmoji(e)}>
                <MangaChip
                  label={e}
                  tone={emoji === e ? 'yellow' : 'paper'}
                  size="lg"
                />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 24 }}>
          <InkButton
            variant="primary"
            label={submitting ? '저장 중…' : '메모리 저장'}
            onPress={onSubmit}
            disabled={submitting}
            fullWidth
            size="lg"
          />
        </View>

        <Text style={styles.note} allowFontScaling={false}>
          사진 첨부 / 함께한 친구 / 위치 등록은 곧 추가됩니다.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MANGA.paper2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  h1: {
    fontFamily: FONT_FAMILY.display,
    fontSize: 20,
    color: MANGA.ink,
    letterSpacing: -0.5,
  },
  fieldLabel: {
    color: MANGA.ink,
    opacity: 0.65,
    fontSize: 11,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: 0.3,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  titleInput: {
    color: MANGA.ink,
    fontSize: 16,
    fontFamily: FONT_FAMILY.primaryBold,
    paddingVertical: 8,
    letterSpacing: -0.3,
  },
  note: {
    color: MANGA.ink,
    opacity: 0.5,
    fontSize: 12,
    fontFamily: FONT_FAMILY.primary,
    textAlign: 'center',
    marginTop: 24,
  },
});
