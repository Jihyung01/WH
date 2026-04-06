import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  FadeIn,
  FadeInUp,
} from 'react-native-reanimated';

import {
  useCharacterStore,
  getEvolutionStage,
  getEvolutionEmoji,
} from '../src/stores/characterStore';
import { sendCharacterChat, getChatHistory, AppError } from '../src/lib/api';
import type { ChatMessage } from '../src/lib/api';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOWS,
  BRAND,
} from '../src/config/theme';

const SUGGESTED_QUESTIONS = [
  '이 동네 맛집 추천해줘',
  '오늘 어디 탐험하면 좋을까?',
  '재미있는 이야기 해줘',
];

interface DisplayMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  createdAt: string;
}

function TypingIndicator() {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const bounce = (delay: number) =>
      withRepeat(
        withDelay(
          delay,
          withSequence(
            withTiming(-6, { duration: 300 }),
            withTiming(0, { duration: 300 }),
          ),
        ),
        -1,
      );
    dot1.value = bounce(0);
    dot2.value = bounce(150);
    dot3.value = bounce(300);
  }, []);

  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  return (
    <View style={styles.typingRow}>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.dot, s1]} />
        <Animated.View style={[styles.dot, s2]} />
        <Animated.View style={[styles.dot, s3]} />
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { character } = useCharacterStore();
  const flatListRef = useRef<FlatList<DisplayMessage>>(null);

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [remainingChats, setRemainingChats] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const characterType = character?.character_type ?? 'explorer';
  const characterLevel = character?.level ?? 1;
  const stage = getEvolutionStage(characterLevel);
  const emoji = getEvolutionEmoji(characterType, stage);
  const characterName = character?.name ?? '도담';

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const history = await getChatHistory(50);
      const mapped: DisplayMessage[] = [];
      for (const row of history) {
        mapped.push({
          id: `${row.id}-user`,
          role: 'user',
          text: row.user_message,
          createdAt: row.created_at,
        });
        mapped.push({
          id: `${row.id}-ai`,
          role: 'ai',
          text: row.ai_reply,
          createdAt: row.created_at,
        });
      }
      setMessages(mapped);
    } catch {
      // silently fail — user sees empty chat
    } finally {
      setIsLoading(false);
    }
  }

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    const event = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(event, () => {
      scrollToBottom();
    });
    return () => sub.remove();
  }, [scrollToBottom]);

  async function handleSend(text?: string) {
    const msg = (text ?? inputText).trim();
    if (!msg) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText('');

    const userMsg: DisplayMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: msg,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    scrollToBottom();

    setIsTyping(true);
    try {
      const reply = await sendCharacterChat(msg);
      const aiMsg: DisplayMessage = {
        id: `a-${Date.now()}`,
        role: 'ai',
        text: reply.reply,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setRemainingChats(reply.remaining_chats_today);
    } catch (err) {
      const detail =
        err instanceof AppError ? err.message : '잠시 후 다시 시도해주세요.';
      const errorMsg: DisplayMessage = {
        id: `e-${Date.now()}`,
        role: 'ai',
        text: `⚠️ ${detail}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  }

  function renderMessage({ item }: { item: DisplayMessage }) {
    const isUser = item.role === 'user';

    if (isUser) {
      return (
        <Animated.View entering={FadeInUp.duration(200)} style={styles.userRow}>
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{item.text}</Text>
          </View>
        </Animated.View>
      );
    }

    return (
      <Animated.View entering={FadeInUp.duration(200)} style={styles.aiRow}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>{emoji}</Text>
        </View>
        <View style={styles.aiBubble}>
          <Text style={styles.aiText}>{item.text}</Text>
        </View>
      </Animated.View>
    );
  }

  const hasMessages = messages.length > 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarEmoji}>{emoji}</Text>
          </View>
          <View>
            <Text style={styles.headerName}>{characterName}</Text>
            <Text style={styles.headerSub}>AI 대화</Text>
          </View>
        </View>
        <Pressable
          style={styles.closeBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="close" size={24} color={COLORS.textSecondary} />
        </Pressable>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={BRAND.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          style={styles.messageListFlex}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={[
            styles.messageList,
            !hasMessages && styles.messageListEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (hasMessages) scrollToBottom();
          }}
          ListEmptyComponent={
            <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
              <View style={styles.emptyAvatarLarge}>
                <Text style={{ fontSize: 48 }}>{emoji}</Text>
              </View>
              <Text style={styles.emptyTitle}>
                {characterName}에게 말을 걸어보세요!
              </Text>
              <Text style={styles.emptySubtitle}>
                동네 이야기, 맛집 추천, 탐험 팁 등{'\n'}무엇이든 물어보세요
              </Text>
              <View style={styles.chipContainer}>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <Pressable
                    key={q}
                    style={styles.chip}
                    onPress={() => handleSend(q)}
                  >
                    <Text style={styles.chipText}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          }
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
        />
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
        {remainingChats !== null && (
          <Text style={styles.remainingLabel}>
            오늘 {remainingChats}회 남음
          </Text>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          <Pressable
            style={[
              styles.sendBtn,
              !inputText.trim() && styles.sendBtnDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isTyping}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? '#FFF' : COLORS.textMuted}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  messageListFlex: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarEmoji: {
    fontSize: 20,
  },
  headerName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  headerSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Message list
  messageList: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  messageListEmpty: {
    flex: 1,
    justifyContent: 'center',
  },

  // User bubble
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: SPACING.md,
  },
  userBubble: {
    maxWidth: '75%',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.sm / 2,
  },
  userText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZE.md * 1.5,
  },

  // AI bubble
  aiRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${BRAND.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  avatarEmoji: {
    fontSize: 16,
  },
  aiBubble: {
    maxWidth: '70%',
    backgroundColor: `${BRAND.primary}15`,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderTopLeftRadius: BORDER_RADIUS.sm / 2,
  },
  aiText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZE.md * 1.5,
  },

  // Typing indicator
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
    paddingLeft: 32 + SPACING.sm,
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: `${BRAND.primary}15`,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderTopLeftRadius: BORDER_RADIUS.sm / 2,
    gap: 4,
    alignItems: 'center',
    height: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.primary,
    opacity: 0.6,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${BRAND.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: FONT_SIZE.sm * 1.6,
    marginBottom: SPACING.xl,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  chip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: BRAND.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  chipText: {
    fontSize: FONT_SIZE.sm,
    color: BRAND.primary,
    fontWeight: FONT_WEIGHT.medium,
  },

  // Input bar
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  remainingLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: Platform.OS === 'ios' ? SPACING.md : SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.surfaceLight,
  },
});
