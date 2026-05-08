/**
 * 새 장소 메모리 작성 화면 (Phase 7).
 *
 * Spec §5.2 — 폴라로이드 카드.
 * 제목 / 이모지 / 사진 1장 → RPC create_place_memory 호출.
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
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { createPlaceMemory, uploadPlaceMemoryPhoto } from '../../src/lib/api';
import { MANGA, FONT_FAMILY } from '../../src/config/theme';
import { InkCard, InkButton, MangaChip, showToast } from '../../src/components/ui';

const EMOJIS = ['🌅', '☕', '🌸', '🍜', '🎨', '🌳', '🎵', '🍰', '🌙', '✨'];

export default function MemoryCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState<string>(EMOJIS[0]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [picking, setPicking] = useState(false);

  const onPickPhoto = async () => {
    setPicking(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('권한 필요', '사진을 첨부하려면 사진 권한이 필요합니다.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsMultipleSelection: false,
      });
      if (res.canceled || !res.assets?.[0]) return;
      setPhotoUri(res.assets[0].uri);
    } catch (e) {
      Alert.alert('사진 선택 실패', e instanceof Error ? e.message : '잠시 후 다시 시도');
    } finally {
      setPicking(false);
    }
  };

  const onSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('제목', '메모리 제목을 적어주세요.');
      return;
    }
    setSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (photoUri) {
        photoUrl = await uploadPlaceMemoryPhoto(photoUri);
      }
      await createPlaceMemory({
        title: title.trim(),
        emoji,
        photo_url: photoUrl,
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
        {/* 폴라로이드 사진 영역 */}
        <View style={styles.polaroidWrap}>
          <View style={styles.polaroidShadow} />
          <View style={styles.polaroidBody}>
            <Pressable onPress={onPickPhoto} style={styles.polaroidPhoto}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <View style={styles.polaroidPlaceholder}>
                  <Ionicons name="camera" size={36} color={MANGA.ink} />
                  <Text style={styles.polaroidHint} allowFontScaling={false}>
                    {picking ? '선택 중…' : '사진 추가'}
                  </Text>
                </View>
              )}
            </Pressable>
            <Text style={styles.polaroidEmoji} allowFontScaling={false}>{emoji}</Text>
          </View>
        </View>

        <InkCard radius="cardLg" shadow="md" pad={{ v: 14, h: 14 }} style={{ marginTop: 16 }}>
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
  // 폴라로이드
  polaroidWrap: {
    alignSelf: 'center',
    marginTop: 8,
    width: 240,
    transform: [{ rotate: '-2.5deg' }],
  },
  polaroidShadow: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: -5,
    bottom: -5,
    backgroundColor: MANGA.ink,
    borderRadius: 6,
  },
  polaroidBody: {
    backgroundColor: MANGA.paper,
    borderWidth: 2.5,
    borderColor: MANGA.ink,
    borderRadius: 6,
    padding: 12,
    paddingBottom: 28,
  },
  polaroidPhoto: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: MANGA.paper2,
    borderWidth: 2,
    borderColor: MANGA.ink,
    borderRadius: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  polaroidPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  polaroidHint: {
    color: MANGA.ink,
    opacity: 0.6,
    fontSize: 13,
    fontFamily: FONT_FAMILY.primaryBold,
  },
  polaroidEmoji: {
    fontSize: 22,
    textAlign: 'center',
    marginTop: 8,
  },
  // 필드
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
});
