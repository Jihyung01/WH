import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MANGA, FONT_FAMILY } from '../../src/config/theme';
import { InkCard, MangaChip } from '../../src/components/ui';

/**
 * 메시지 탭 (Phase 1 placeholder).
 *
 * Phase 5 에서 채워질 것:
 *   - LIVE 그룹 영상통화 배너 (오렌지 그라디언트 + 참여 버튼)
 *   - 4개 빠른 액션 (그룹 만들기 / 단체 영상 / 번개 약속 / 위치 공유)
 *   - 세그먼트 (전체 / 그룹 / DM)
 *   - 그룹 채팅방 / 개인 메시지 리스트 (Realtime)
 *
 * 스키마 / RPC / Edge Function 도 Phase 5 에서 추가 예정.
 *   chat_rooms, chat_room_members, messages
 *   send_message, get_or_create_1on1_room, list_my_chat_rooms
 *
 * 이 placeholder 는 탭바 구조를 먼저 5탭으로 잡기 위한 임시 화면.
 */
export default function MessagesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
      ]}
    >
      <Text style={styles.h1} allowFontScaling={false}>
        메:시지
      </Text>

      <InkCard radius="cardLg" shadow="md" pad={20} style={{ marginTop: 24 }}>
        <Text style={styles.placeholder} allowFontScaling={false}>
          메시지 기능은 다음 업데이트에서 들어와요.
        </Text>
        <Text style={styles.placeholderSub} allowFontScaling={false}>
          그룹 채팅 / 1:1 DM / 단체 영상통화 / 위치 공유 메시지가 곧 추가됩니다.
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          <MangaChip label="그룹 채팅" tone="yellow" />
          <MangaChip label="1:1 DM" tone="blue" />
          <MangaChip label="단체 영상" tone="red" />
          <MangaChip label="위치 공유" tone="green" />
          <MangaChip label="번개 약속 ⚡" tone="paper" />
        </View>
      </InkCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MANGA.paper2,
  },
  content: {
    paddingHorizontal: 20,
  },
  h1: {
    fontFamily: FONT_FAMILY.display,
    fontSize: 36,
    color: MANGA.ink,
    letterSpacing: -1,
    includeFontPadding: false,
  },
  placeholder: {
    fontFamily: FONT_FAMILY.primaryBold,
    fontSize: 16,
    color: MANGA.ink,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  placeholderSub: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: 13,
    color: MANGA.ink,
    opacity: 0.65,
    marginTop: 6,
    lineHeight: 19,
  },
});
