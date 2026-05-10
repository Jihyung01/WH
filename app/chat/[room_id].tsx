/**
 * 채팅방 화면 — Phase 5 (Spec §6).
 *
 * 1:1 / 그룹 / 크루 채팅방. Realtime 으로 새 메시지 자동 수신.
 *
 * UI:
 *   - 상단 헤더: 뒤로가기 + 방 제목 + 멤버 수 / 영상통화 버튼 / 더보기
 *   - 메시지 리스트 (역순, 최신 하단)
 *   - 본인 메시지 = 노랑 말풍선 우측, 상대 메시지 = 종이 말풍선 좌측
 *   - 입력창 (텍스트 + 위치 / 이벤트 / 사진 첨부 — Phase 7+ 확장)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import {
  listRoomMessages,
  sendMessage,
  markRoomRead,
  startGroupCall,
  uploadChatPhoto,
  type RoomMessage,
} from '../../src/lib/api';
import { supabase } from '../../src/config/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { MANGA, MANGA_BORDER, MANGA_RADIUS, FONT_FAMILY } from '../../src/config/theme';
import { MangaAvatar } from '../../src/components/ui';

export default function ChatRoomScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ room_id: string }>();
  const roomId = params.room_id;
  const me = useAuthStore((s) => s.user?.id);

  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // 메시지 로드
  const load = useCallback(async () => {
    if (!roomId) return;
    try {
      const list = await listRoomMessages(roomId);
      // RPC 가 desc 로 반환 → asc 로 뒤집어 표시
      setMessages(list.reverse());
      void markRoomRead(roomId).catch(() => {});
    } catch (e) {
      console.warn('chat load fail', e);
    }
  }, [roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime 구독
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload: { new: Record<string, unknown> }) => {
          const m = payload.new;
          // sender_name 은 RPC 에서만 join — realtime payload 에는 없음.
          // 본 화면에서는 sender_id 만 채우고 sender_name 은 후속 fetch
          const next: RoomMessage = {
            id: String(m.id),
            sender_id: String(m.sender_id),
            sender_name: null,
            content: (m.content as string | null) ?? null,
            message_type: (m.message_type as RoomMessage['message_type']) ?? 'text',
            payload: (m.payload as Record<string, unknown> | null) ?? null,
            created_at: String(m.created_at),
          };
          setMessages((prev) => [...prev, next]);
          void markRoomRead(roomId).catch(() => {});
          // 자동 스크롤
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !roomId) return;
    setSending(true);
    try {
      await sendMessage({ roomId, content: text });
      setInput('');
      if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (e) {
      Alert.alert('전송 실패', e instanceof Error ? e.message : '잠시 후 다시 시도');
    } finally {
      setSending(false);
    }
  }, [input, roomId]);

  const openGroupCall = useCallback(async () => {
    if (!roomId) return;
    try {
      await startGroupCall(roomId);
      router.push(`/chat/group-call/${roomId}` as never);
    } catch (error) {
      Alert.alert('오류', error instanceof Error ? error.message : '영상 방을 열지 못했어요.');
    }
  }, [roomId, router]);

  const onAttachPhoto = useCallback(async () => {
    if (!roomId || attaching) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '사진을 보내려면 사진 접근 권한이 필요해요.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.86,
    });
    if (picked.canceled || !picked.assets[0]?.uri) return;

    setAttaching(true);
    try {
      const url = await uploadChatPhoto(roomId, picked.assets[0].uri);
      await sendMessage({
        roomId,
        content: '사진',
        messageType: 'image',
        payload: { url },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('전송 실패', error instanceof Error ? error.message : '사진을 보내지 못했어요.');
    } finally {
      setAttaching(false);
    }
  }, [attaching, roomId]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={MANGA.ink} />
        </Pressable>
        <Text style={styles.headerTitle} allowFontScaling={false}>채팅</Text>
        <Pressable
          onPress={openGroupCall}
          hitSlop={8}
          style={styles.headerBtn}
        >
          <Ionicons name="videocam-outline" size={22} color={MANGA.ink} />
        </Pressable>
      </View>

      {/* 메시지 리스트 */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.listPad, { paddingBottom: 16 }]}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText} allowFontScaling={false}>
              첫 메시지를 보내보세요 ✦
            </Text>
          </View>
        ) : (
          messages.map((msg, idx) => {
            const mine = msg.sender_id === me;
            const prev = messages[idx - 1];
            const showSender = !mine && (!prev || prev.sender_id !== msg.sender_id);
            return (
              <Bubble
                key={msg.id}
                msg={msg}
                mine={mine}
                showSender={showSender}
              />
            );
          })
        )}
      </ScrollView>

      {/* 입력창 */}
      <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable
          onPress={onAttachPhoto}
          style={styles.attachBtn}
          hitSlop={6}
        >
          {attaching ? (
            <ActivityIndicator size="small" color={MANGA.ink} />
          ) : (
            <Ionicons name="add" size={22} color={MANGA.ink} />
          )}
        </Pressable>
        <View style={styles.inputBox}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor="rgba(26,22,18,0.4)"
            style={styles.input}
            multiline
            maxLength={2000}
            allowFontScaling={false}
          />
        </View>
        <Pressable
          onPress={onSend}
          disabled={sending || !input.trim()}
          style={({ pressed }) => [
            styles.sendBtn,
            { opacity: !input.trim() ? 0.4 : 1 },
            pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] },
          ]}
        >
          <View style={[styles.sendShadow, { top: 2, left: 2 }]} />
          <View style={styles.sendBody}>
            <Ionicons name="paper-plane" size={20} color={MANGA.ink} />
          </View>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ msg, mine, showSender }: { msg: RoomMessage; mine: boolean; showSender: boolean }) {
  return (
    <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : null]}>
      {!mine ? (
        <View style={{ width: 36, marginRight: 8 }}>
          {showSender ? <MangaAvatar name={msg.sender_name ?? '?'} size={36} /> : null}
        </View>
      ) : null}
      <View style={{ maxWidth: '72%' }}>
        {showSender && !mine ? (
          <Text style={styles.senderName} allowFontScaling={false}>{msg.sender_name ?? '친구'}</Text>
        ) : null}
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          {msg.message_type === 'image' && typeof msg.payload?.url === 'string' ? (
            <Image source={{ uri: msg.payload.url }} style={styles.bubbleImage} contentFit="cover" />
          ) : (
            <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : null]} allowFontScaling={false}>
              {msg.content}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MANGA.paper2 },
  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: MANGA.ink,
    backgroundColor: MANGA.paper,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: MANGA.ink, fontSize: 16, fontFamily: FONT_FAMILY.primaryBold, letterSpacing: -0.3, textAlign: 'center' },
  // list
  listPad: { paddingHorizontal: 12, paddingTop: 12 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: MANGA.ink, opacity: 0.5, fontSize: 13, fontFamily: FONT_FAMILY.primary },
  // bubble
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  senderName: { color: MANGA.ink, opacity: 0.6, fontSize: 11, fontFamily: FONT_FAMILY.primaryBold, marginBottom: 2, marginLeft: 12 },
  bubble: { borderRadius: 14, borderWidth: 2, borderColor: MANGA.ink, paddingVertical: 8, paddingHorizontal: 12 },
  bubbleOther: { backgroundColor: MANGA.paper, borderTopLeftRadius: 4 },
  bubbleMine: { backgroundColor: MANGA.y, borderTopRightRadius: 4 },
  bubbleText: { color: MANGA.ink, fontSize: 14, fontFamily: FONT_FAMILY.primary, lineHeight: 20 },
  bubbleTextMine: {},
  bubbleImage: { width: 190, height: 190, borderRadius: 10 },
  // input
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 2, borderTopColor: MANGA.ink, backgroundColor: MANGA.paper },
  attachBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: MANGA.ink, backgroundColor: MANGA.paper2, alignItems: 'center', justifyContent: 'center' },
  inputBox: { flex: 1, borderRadius: 20, borderWidth: 2, borderColor: MANGA.ink, backgroundColor: MANGA.paper2, paddingHorizontal: 14, minHeight: 38, maxHeight: 100, justifyContent: 'center' },
  input: { color: MANGA.ink, fontSize: 14, fontFamily: FONT_FAMILY.primary, paddingVertical: 8 },
  sendBtn: { width: 38, height: 38, position: 'relative' },
  sendShadow: { position: 'absolute', width: 38, height: 38, borderRadius: 19, backgroundColor: MANGA.ink },
  sendBody: { width: 38, height: 38, borderRadius: 19, backgroundColor: MANGA.r, borderWidth: 2, borderColor: MANGA.ink, alignItems: 'center', justifyContent: 'center' },
});
