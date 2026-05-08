import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { deleteAccount, getMyProfile, updateProfile } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/authStore';
import { MANGA, MANGA_BORDER, MANGA_RADIUS, FONT_FAMILY, SPACING } from '../../src/config/theme';
import { showToast } from '../../src/components/ui';

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signOut = useAuthStore((s) => s.signOut);
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    getMyProfile()
      .then((profile) => {
        if (alive) setUsername(profile.username ?? '');
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const save = useCallback(async () => {
    const next = username.trim();
    if (next.length < 2) {
      Alert.alert('확인', '닉네임은 두 글자 이상 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ username: next });
      showToast('닉네임을 저장했어요', { tone: 'paper', icon: '✅' });
    } catch (error) {
      Alert.alert('오류', error instanceof Error ? error.message : '저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  }, [username]);

  const logout = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('로그아웃', '정말 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  }, [router, signOut]);

  const removeAccount = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('계정 삭제', '모든 데이터가 삭제되며 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount();
            await signOut();
            router.replace('/(auth)/welcome');
          } catch (error) {
            Alert.alert('오류', error instanceof Error ? error.message : '계정을 삭제하지 못했어요.');
          }
        },
      },
    ]);
  }, [router, signOut]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={MANGA.ink} />
        </Pressable>
        <Text style={styles.headerTitle} allowFontScaling={false}>계정 관리</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.card}>
          <Text style={styles.label} allowFontScaling={false}>닉네임</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="닉네임"
            placeholderTextColor="rgba(26,22,18,0.42)"
            style={styles.input}
            maxLength={24}
            allowFontScaling={false}
          />
          <Pressable onPress={save} disabled={saving} style={[styles.button, saving && styles.disabled]}>
            <Text style={styles.buttonText} allowFontScaling={false}>{saving ? '저장 중' : '저장'}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.label} allowFontScaling={false}>접속</Text>
          <Pressable onPress={logout} style={[styles.button, styles.paperButton]}>
            <Text style={styles.buttonText} allowFontScaling={false}>로그아웃</Text>
          </Pressable>
        </View>

        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle} allowFontScaling={false}>계정 삭제</Text>
          <Text style={styles.dangerText} allowFontScaling={false}>
            프로필과 탐험 기록 삭제를 요청합니다. 완료 후 다시 로그인할 수 없어요.
          </Text>
          <Pressable onPress={removeAccount} style={[styles.button, styles.dangerButton]}>
            <Text style={styles.dangerButtonText} allowFontScaling={false}>계정 삭제</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MANGA.paper2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: MANGA_BORDER.width,
    borderBottomColor: MANGA.ink,
    backgroundColor: MANGA.paper,
  },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: MANGA.ink, fontSize: 18, fontFamily: FONT_FAMILY.primaryBold },
  content: { padding: SPACING.lg, gap: SPACING.md },
  card: {
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.cardLg,
    backgroundColor: MANGA.paper,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  label: { color: MANGA.ink, fontSize: 13, fontFamily: FONT_FAMILY.primaryBold },
  input: {
    minHeight: 46,
    borderWidth: 2,
    borderColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.card,
    backgroundColor: MANGA.paper2,
    color: MANGA.ink,
    fontSize: 15,
    fontFamily: FONT_FAMILY.primaryBold,
    paddingHorizontal: SPACING.md,
  },
  button: {
    height: 46,
    borderWidth: 2,
    borderColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.card,
    backgroundColor: MANGA.y,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperButton: { backgroundColor: MANGA.paper2 },
  disabled: { opacity: 0.55 },
  buttonText: { color: MANGA.ink, fontSize: 14, fontFamily: FONT_FAMILY.primaryBold },
  dangerCard: {
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.cardLg,
    backgroundColor: '#FFE1E4',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  dangerTitle: { color: MANGA.ink, fontSize: 15, fontFamily: FONT_FAMILY.primaryBold },
  dangerText: { color: MANGA.ink, opacity: 0.68, fontSize: 12, fontFamily: FONT_FAMILY.primary, lineHeight: 18 },
  dangerButton: { backgroundColor: MANGA.r },
  dangerButtonText: { color: MANGA.paper, fontSize: 14, fontFamily: FONT_FAMILY.primaryBold },
});
