/**
 * 새 일기 작성 화면 (Phase 7 — 일단 minimal MVP).
 *
 * Spec §5.3 의 작성 시트:
 *   - 제목 / 본문 / 장소 태그 / 공개 범위 / 사진 첨부
 *
 * 본 화면은 minimum viable: 제목·본문·공개범위 만 받아 RPC create_diary 호출.
 * 사진/장소/친구 멘션은 추후 확장.
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

import { createDiary, type DiaryVisibility } from '../../src/lib/api';
import { MANGA, MANGA_BORDER, MANGA_RADIUS, FONT_FAMILY } from '../../src/config/theme';
import { InkCard, InkButton, MangaChip, showToast } from '../../src/components/ui';

const VISIBILITY_OPTIONS: { value: DiaryVisibility; label: string; emoji: string }[] = [
  { value: 'public',  label: '전체공개', emoji: '🌍' },
  { value: 'friends', label: '친구만',   emoji: '👥' },
  { value: 'private', label: '비공개',   emoji: '🔒' },
];

export default function DiaryCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [placeLabel, setPlaceLabel] = useState('');
  const [visibility, setVisibility] = useState<DiaryVisibility>('private');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('제목', '제목을 적어주세요.');
      return;
    }
    if (!body.trim()) {
      Alert.alert('본문', '오늘의 한 줄을 남겨주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await createDiary({
        title: title.trim(),
        body: body.trim(),
        place_label: placeLabel.trim() || null,
        visibility,
      });
      showToast('일기 저장됨', { tone: 'success', icon: '✦' });
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
        <Text style={styles.h1} allowFontScaling={false}>새 일기</Text>
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
            placeholder="오늘의 한 줄"
            placeholderTextColor="rgba(26,22,18,0.4)"
            style={styles.titleInput}
            allowFontScaling={false}
            maxLength={60}
          />
        </InkCard>

        <InkCard radius="cardLg" shadow="md" pad={{ v: 14, h: 14 }} style={{ marginTop: 12 }}>
          <Text style={styles.fieldLabel} allowFontScaling={false}>본문</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="어디서 무엇을 했나요? 어떤 기분이었나요?"
            placeholderTextColor="rgba(26,22,18,0.4)"
            style={styles.bodyInput}
            multiline
            allowFontScaling={false}
            maxLength={2000}
          />
        </InkCard>

        <InkCard radius="cardLg" shadow="md" pad={{ v: 14, h: 14 }} style={{ marginTop: 12 }}>
          <Text style={styles.fieldLabel} allowFontScaling={false}>장소 (선택)</Text>
          <TextInput
            value={placeLabel}
            onChangeText={setPlaceLabel}
            placeholder="예: 정자동 카페거리"
            placeholderTextColor="rgba(26,22,18,0.4)"
            style={styles.titleInput}
            allowFontScaling={false}
            maxLength={40}
          />
        </InkCard>

        <View style={{ marginTop: 12 }}>
          <Text style={[styles.fieldLabel, { paddingHorizontal: 4 }]} allowFontScaling={false}>
            공개 범위
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {VISIBILITY_OPTIONS.map((opt) => (
              <Pressable key={opt.value} onPress={() => setVisibility(opt.value)}>
                <MangaChip
                  label={`${opt.emoji} ${opt.label}`}
                  tone={visibility === opt.value ? 'yellow' : 'paper'}
                  size="lg"
                />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 24 }}>
          <InkButton
            variant="primary"
            label={submitting ? '저장 중…' : '일기 저장'}
            onPress={onSubmit}
            disabled={submitting}
            fullWidth
            size="lg"
          />
        </View>
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
  bodyInput: {
    color: MANGA.ink,
    fontSize: 14,
    fontFamily: FONT_FAMILY.mono,
    paddingVertical: 8,
    lineHeight: 22,
    minHeight: 140,
    textAlignVertical: 'top',
  },
});
