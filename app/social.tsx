import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp, FadeInDown } from 'react-native-reanimated';

import {
  getFriends,
  sendFriendRequest,
  respondFriendRequest,
  getMyCrew,
  createCrew,
  joinCrew,
  leaveCrew,
} from '../src/lib/api';
import {
  startLocationSharing,
  stopLocationSharing,
  isLocationSharingActive,
} from '../src/services/friendLocation';
import type { FriendsResult, FriendInfo, MyCrewResult, CrewMember } from '../src/lib/api';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BRAND,
  BORDER_RADIUS,
  SHADOWS,
} from '../src/config/theme';

type TabKey = 'friends' | 'crew';

const CHARACTER_ICONS: Record<string, string> = {
  explorer: '🧭',
  foodie: '📸',
  artist: '📚',
  socialite: '🤝',
};

const CREW_EMOJI_PRESETS = [
  '⚔️', '🔥', '🌟', '🐉', '🦊', '🏔️',
  '🌊', '🎯', '🚀', '💎', '🛡️', '🌙',
];

const SEOUL_DISTRICTS = [
  '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구',
  '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구',
  '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구',
];

function Toast({ message, type, visible }: { message: string; type: 'success' | 'error'; visible: boolean }) {
  if (!visible) return null;
  return (
    <Animated.View entering={FadeInUp.duration(200)} style={[toastStyles.container, type === 'error' && toastStyles.error]}>
      <Ionicons
        name={type === 'success' ? 'checkmark-circle' : 'alert-circle'}
        size={18}
        color="#FFF"
      />
      <Text style={toastStyles.text}>{message}</Text>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 8,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: BRAND.primary,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    zIndex: 100,
    ...SHADOWS.md,
  },
  error: { backgroundColor: COLORS.error },
  text: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: '#FFF', flex: 1 },
});

function AvatarCircle({ username, avatarUrl, size = 44 }: { username: string; avatarUrl?: string | null; size?: number }) {
  const letter = (username ?? '?')[0].toUpperCase();
  const hue = username ? username.charCodeAt(0) * 7 % 360 : 0;
  return (
    <View style={[avatarStyles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue}, 45%, 35%)` }]}>
      <Text style={[avatarStyles.letter, { fontSize: size * 0.42 }]}>{letter}</Text>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  letter: { color: '#FFF', fontWeight: FONT_WEIGHT.bold },
});

// ─── Friends Tab ─────────────────────────────────────────────────────────────

function FriendsTab({
  data,
  loading,
  refreshing,
  onRefresh,
  onShowToast,
}: {
  data: FriendsResult | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [searchText, setSearchText] = useState('');
  const [sending, setSending] = useState(false);
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set());
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(() => isLocationSharingActive());

  const handleLocationToggle = async (value: boolean) => {
    if (value) {
      const granted = await startLocationSharing();
      setLocationSharingEnabled(granted);
      if (!granted) onShowToast('위치 권한이 필요해요.', 'error');
    } else {
      await stopLocationSharing();
      setLocationSharingEnabled(false);
    }
  };

  const handleSendRequest = async () => {
    const username = searchText.trim();
    if (!username) return;
    try {
      setSending(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await sendFriendRequest(username);
      if (result.success) {
        onShowToast(`${username}님에게 친구 요청을 보냈어요!`, 'success');
        setSearchText('');
        onRefresh();
      } else {
        const reasons: Record<string, string> = {
          user_not_found: '해당 닉네임의 유저를 찾을 수 없어요.',
          cannot_add_self: '자기 자신은 추가할 수 없어요.',
          already_exists: '이미 친구이거나 요청이 존재해요.',
        };
        onShowToast(reasons[result.reason ?? ''] ?? '요청에 실패했어요.', 'error');
      }
    } catch {
      onShowToast('친구 요청에 실패했어요.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleRespond = async (friendshipId: string, accept: boolean) => {
    try {
      setRespondingIds((prev) => new Set(prev).add(friendshipId));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await respondFriendRequest(friendshipId, accept);
      onShowToast(accept ? '친구가 되었어요!' : '요청을 거절했어요.', accept ? 'success' : 'error');
      onRefresh();
    } catch {
      onShowToast('처리에 실패했어요.', 'error');
    } finally {
      setRespondingIds((prev) => {
        const next = new Set(prev);
        next.delete(friendshipId);
        return next;
      });
    }
  };

  if (loading && !data) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={BRAND.primary} />
      </View>
    );
  }

  const friends = data?.friends ?? [];
  const pending = data?.pending_requests ?? [];

  return (
    <ScrollView
      style={s.tabContent}
      contentContainerStyle={s.tabContentInner}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} colors={[BRAND.primary]} />}
      keyboardShouldPersistTaps="handled"
    >
      {/* Location sharing toggle */}
      <Animated.View entering={FadeInUp.duration(300)} style={s.locationShareRow}>
        <View style={s.locationShareTextCol}>
          <Text style={s.locationShareLabel}>📍 실시간 위치 공유</Text>
          <Text style={s.locationShareDesc}>
            친구 지도에 내 위치를 표시해요. 백그라운드에서도 갱신하려면 위치 “항상 허용”이 필요해요.
          </Text>
        </View>
        <View
          style={[
            s.locationShareSwitchWrap,
            Platform.OS === 'ios' && s.locationShareSwitchWrapIOS,
          ]}
        >
          <Switch
            value={locationSharingEnabled}
            onValueChange={handleLocationToggle}
            trackColor={{ false: COLORS.surfaceLight, true: BRAND.primary }}
            thumbColor="#FFF"
          />
        </View>
      </Animated.View>

      {/* Search bar */}
      <Animated.View entering={FadeInUp.duration(300)} style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="닉네임으로 친구 추가"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          onSubmitEditing={handleSendRequest}
        />
        <Pressable
          style={[s.searchBtn, (!searchText.trim() || sending) && s.searchBtnDisabled]}
          onPress={handleSendRequest}
          disabled={!searchText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={s.searchBtnText}>추가</Text>
          )}
        </Pressable>
      </Animated.View>

      {/* Pending requests */}
      {pending.length > 0 && (
        <Animated.View entering={FadeInUp.duration(300).delay(100)}>
          <Text style={s.sectionTitle}>받은 요청 ({pending.length})</Text>
          {pending.map((req) => (
            <View key={req.friendship_id} style={s.friendRow}>
              <AvatarCircle username={req.username} />
              <Text style={s.friendName} numberOfLines={1}>{req.username}</Text>
              <View style={s.pendingActions}>
                <Pressable
                  style={s.acceptBtn}
                  onPress={() => handleRespond(req.friendship_id, true)}
                  disabled={respondingIds.has(req.friendship_id)}
                >
                  {respondingIds.has(req.friendship_id) ? (
                    <ActivityIndicator size={14} color="#FFF" />
                  ) : (
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                  )}
                </Pressable>
                <Pressable
                  style={s.rejectBtn}
                  onPress={() => handleRespond(req.friendship_id, false)}
                  disabled={respondingIds.has(req.friendship_id)}
                >
                  <Ionicons name="close" size={18} color={COLORS.error} />
                </Pressable>
              </View>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Friends list */}
      <Animated.View entering={FadeInUp.duration(300).delay(pending.length > 0 ? 200 : 100)}>
        <Text style={s.sectionTitle}>친구 ({friends.length})</Text>
        {friends.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyEmoji}>👋</Text>
            <Text style={s.emptyText}>아직 친구가 없어요.{'\n'}닉네임으로 친구를 추가해보세요!</Text>
          </View>
        ) : (
          friends.map((friend, idx) => (
            <Animated.View key={friend.friendship_id} entering={FadeInUp.duration(250).delay(idx * 40)}>
              <View style={s.friendRow}>
                <AvatarCircle username={friend.username} />
                <View style={s.friendInfo}>
                  <Text style={s.friendName} numberOfLines={1}>{friend.username}</Text>
                  <View style={s.friendMeta}>
                    {friend.level != null && (
                      <View style={s.levelBadge}>
                        <Text style={s.levelBadgeText}>Lv.{friend.level}</Text>
                      </View>
                    )}
                    {friend.character_type && (
                      <Text style={s.charIcon}>{CHARACTER_ICONS[friend.character_type] ?? '🎮'}</Text>
                    )}
                  </View>
                </View>
              </View>
            </Animated.View>
          ))
        )}
      </Animated.View>
    </ScrollView>
  );
}

// ─── Crew Tab ────────────────────────────────────────────────────────────────

function CrewTab({
  data,
  loading,
  refreshing,
  onRefresh,
  onShowToast,
}: {
  data: MyCrewResult | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const insets = useSafeAreaInsets();

  if (loading && !data) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={BRAND.primary} />
      </View>
    );
  }

  if (!data?.has_crew) {
    return <NoCrewView onShowToast={onShowToast} onRefresh={onRefresh} />;
  }

  return (
    <HasCrewView
      data={data}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onShowToast={onShowToast}
      bottomInset={insets.bottom}
    />
  );
}

function NoCrewView({
  onShowToast,
  onRefresh,
}: {
  onShowToast: (msg: string, type: 'success' | 'error') => void;
  onRefresh: () => void;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    const code = joinCode.trim();
    if (!code) return;
    try {
      setJoining(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await joinCrew(code);
      if (result.success) {
        onShowToast(`${result.crew_name ?? '크루'}에 가입했어요!`, 'success');
        setJoinCode('');
        onRefresh();
      } else {
        const reasons: Record<string, string> = {
          already_in_crew: '이미 다른 크루에 가입되어 있어요.',
          invalid_code: '유효하지 않은 초대 코드예요.',
          crew_full: '크루 인원이 가득 찼어요.',
        };
        onShowToast(reasons[result.reason ?? ''] ?? '가입에 실패했어요.', 'error');
      }
    } catch {
      onShowToast('크루 가입에 실패했어요.', 'error');
    } finally {
      setJoining(false);
    }
  };

  return (
    <ScrollView style={s.tabContent} contentContainerStyle={s.tabContentInner} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn.duration(400)} style={s.noCrewContainer}>
        <Text style={s.noCrewEmoji}>⚔️</Text>
        <Text style={s.noCrewTitle}>아직 크루가 없어요</Text>
        <Text style={s.noCrewDesc}>크루를 만들거나 초대 코드로 가입하세요!</Text>

        <Pressable
          style={s.ctaPrimary}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowCreateModal(true);
          }}
        >
          <Ionicons name="add-circle-outline" size={20} color="#FFF" />
          <Text style={s.ctaPrimaryText}>크루 만들기</Text>
        </Pressable>

        <View style={s.joinRow}>
          <TextInput
            style={s.joinInput}
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder="초대 코드 입력"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={[s.joinBtn, (!joinCode.trim() || joining) && s.searchBtnDisabled]}
            onPress={handleJoin}
            disabled={!joinCode.trim() || joining}
          >
            {joining ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={s.joinBtnText}>가입</Text>
            )}
          </Pressable>
        </View>
      </Animated.View>

      <CreateCrewModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onShowToast={onShowToast}
        onRefresh={onRefresh}
      />
    </ScrollView>
  );
}

function CreateCrewModal({
  visible,
  onClose,
  onShowToast,
  onRefresh,
}: {
  visible: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
  onRefresh: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('⚔️');
  const [district, setDistrict] = useState('');
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      setCreating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await createCrew(name.trim(), description.trim() || undefined, emoji, district || undefined);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onShowToast('크루가 생성되었어요!', 'success');
        onClose();
        onRefresh();
        setName('');
        setDescription('');
        setEmoji('⚔️');
        setDistrict('');
      } else {
        const reasons: Record<string, string> = {
          already_in_crew: '이미 다른 크루에 가입되어 있어요.',
        };
        onShowToast(reasons[result.reason ?? ''] ?? '크루 생성에 실패했어요.', 'error');
      }
    } catch {
      onShowToast('크루 생성에 실패했어요.', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={modalStyles.kav}>
          <View style={[modalStyles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]}>
            <View style={modalStyles.handle} />
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>크루 만들기</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Emoji picker */}
              <Text style={modalStyles.label}>아이콘</Text>
              <View style={modalStyles.emojiGrid}>
                {CREW_EMOJI_PRESETS.map((e) => (
                  <Pressable
                    key={e}
                    style={[modalStyles.emojiBtn, emoji === e && modalStyles.emojiBtnActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setEmoji(e);
                    }}
                  >
                    <Text style={modalStyles.emojiText}>{e}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={modalStyles.label}>크루 이름 *</Text>
              <TextInput
                style={modalStyles.input}
                value={name}
                onChangeText={setName}
                placeholder="예: 서울 탐험대"
                placeholderTextColor={COLORS.textMuted}
                maxLength={20}
              />

              <Text style={modalStyles.label}>소개</Text>
              <TextInput
                style={[modalStyles.input, modalStyles.inputMulti]}
                value={description}
                onChangeText={setDescription}
                placeholder="크루를 소개해주세요"
                placeholderTextColor={COLORS.textMuted}
                multiline
                maxLength={100}
              />

              <Text style={modalStyles.label}>홈 지역</Text>
              <Pressable style={modalStyles.districtBtn} onPress={() => setShowDistrictPicker(!showDistrictPicker)}>
                <Text style={district ? modalStyles.districtText : modalStyles.districtPlaceholder}>
                  {district || '지역 선택 (선택사항)'}
                </Text>
                <Ionicons name={showDistrictPicker ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
              </Pressable>
              {showDistrictPicker && (
                <ScrollView style={modalStyles.districtList} nestedScrollEnabled>
                  {SEOUL_DISTRICTS.map((d) => (
                    <Pressable
                      key={d}
                      style={[modalStyles.districtItem, district === d && modalStyles.districtItemActive]}
                      onPress={() => {
                        setDistrict(d);
                        setShowDistrictPicker(false);
                      }}
                    >
                      <Text style={[modalStyles.districtItemText, district === d && modalStyles.districtItemTextActive]}>
                        {d}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              <Pressable
                style={[modalStyles.createBtn, (!name.trim() || creating) && modalStyles.createBtnDisabled]}
                onPress={handleCreate}
                disabled={!name.trim() || creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={modalStyles.createBtnText}>만들기</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  kav: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surfaceLight,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  label: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary, marginBottom: SPACING.sm, marginTop: SPACING.lg },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiBtnActive: { borderColor: BRAND.primary, backgroundColor: `${BRAND.primary}15` },
  emojiText: { fontSize: 22 },
  districtBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  districtText: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  districtPlaceholder: { fontSize: FONT_SIZE.md, color: COLORS.textMuted },
  districtList: { maxHeight: 180, backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md, marginTop: SPACING.sm },
  districtItem: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  districtItemActive: { backgroundColor: `${BRAND.primary}15` },
  districtItemText: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  districtItemTextActive: { color: BRAND.primary, fontWeight: FONT_WEIGHT.semibold },
  createBtn: {
    backgroundColor: BRAND.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.xl,
    ...SHADOWS.glow,
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: '#FFF' },
});

function HasCrewView({
  data,
  refreshing,
  onRefresh,
  onShowToast,
  bottomInset,
}: {
  data: MyCrewResult;
  refreshing: boolean;
  onRefresh: () => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
  bottomInset: number;
}) {
  const [leaving, setLeaving] = useState(false);
  const crew = data.crew!;
  const members = data.members ?? [];

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(crew.invite_code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onShowToast('초대 코드가 복사되었어요!', 'success');
    } catch {
      onShowToast('복사에 실패했어요.', 'error');
    }
  };

  const handleLeave = () => {
    Alert.alert(
      '크루 탈퇴',
      `${crew.name}에서 정말 탈퇴하시겠어요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            try {
              setLeaving(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await leaveCrew();
              onShowToast('크루에서 탈퇴했어요.', 'success');
              onRefresh();
            } catch {
              onShowToast('탈퇴에 실패했어요.', 'error');
            } finally {
              setLeaving(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={s.tabContent}
      contentContainerStyle={[s.tabContentInner, { paddingBottom: bottomInset + SPACING.xxl }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} colors={[BRAND.primary]} />}
    >
      {/* Crew header */}
      <Animated.View entering={FadeInUp.duration(300)} style={s.crewHeader}>
        <Text style={s.crewEmoji}>{crew.icon_emoji}</Text>
        <Text style={s.crewName}>{crew.name}</Text>
        {crew.description && <Text style={s.crewDesc}>{crew.description}</Text>}
      </Animated.View>

      {/* Stats bar */}
      <Animated.View entering={FadeInUp.duration(300).delay(100)} style={s.statsBar}>
        <View style={s.statItem}>
          <Ionicons name="flash" size={18} color="#FBBF24" />
          <Text style={s.statValue}>{(crew.total_xp ?? 0).toLocaleString()}</Text>
          <Text style={s.statLabel}>총 XP</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Ionicons name="trending-up" size={18} color={BRAND.primary} />
          <Text style={s.statValue}>{(crew.weekly_xp ?? 0).toLocaleString()}</Text>
          <Text style={s.statLabel}>주간 XP</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Ionicons name="people" size={18} color="#818CF8" />
          <Text style={s.statValue}>{crew.member_count}/{crew.max_members}</Text>
          <Text style={s.statLabel}>멤버</Text>
        </View>
      </Animated.View>

      {/* Invite code */}
      <Animated.View entering={FadeInUp.duration(300).delay(200)} style={s.inviteCard}>
        <View style={s.inviteLeft}>
          <Text style={s.inviteLabel}>초대 코드</Text>
          <Text style={s.inviteCode}>{crew.invite_code}</Text>
        </View>
        <Pressable style={s.copyBtn} onPress={handleCopyCode}>
          <Ionicons name="copy-outline" size={18} color={BRAND.primary} />
          <Text style={s.copyBtnText}>복사</Text>
        </Pressable>
      </Animated.View>

      {/* Members */}
      <Animated.View entering={FadeInUp.duration(300).delay(300)}>
        <Text style={s.sectionTitle}>멤버 ({members.length})</Text>
        {members.map((member, idx) => (
          <Animated.View key={member.user_id} entering={FadeInUp.duration(250).delay(idx * 40)}>
            <MemberRow member={member} />
          </Animated.View>
        ))}
      </Animated.View>

      {/* Leave button */}
      <Animated.View entering={FadeInUp.duration(300).delay(400)}>
        <Pressable style={s.leaveBtn} onPress={handleLeave} disabled={leaving}>
          {leaving ? (
            <ActivityIndicator size="small" color={COLORS.error} />
          ) : (
            <>
              <Ionicons name="exit-outline" size={18} color={COLORS.error} />
              <Text style={s.leaveBtnText}>크루 탈퇴</Text>
            </>
          )}
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

function MemberRow({ member }: { member: CrewMember }) {
  const roleLabels: Record<string, { text: string; color: string; icon?: string }> = {
    leader: { text: '리더', color: '#FBBF24', icon: '👑' },
    officer: { text: '부관', color: '#818CF8' },
    member: { text: '멤버', color: COLORS.textMuted },
  };
  const role = roleLabels[member.role] ?? roleLabels.member;

  return (
    <View style={s.memberRow}>
      <AvatarCircle username={member.username} />
      <View style={s.memberInfo}>
        <View style={s.memberNameRow}>
          {role.icon && <Text style={s.crownIcon}>{role.icon}</Text>}
          <Text style={s.memberName} numberOfLines={1}>{member.username}</Text>
          <View style={[s.roleBadge, { backgroundColor: `${role.color}20` }]}>
            <Text style={[s.roleBadgeText, { color: role.color }]}>{role.text}</Text>
          </View>
        </View>
        <View style={s.memberMeta}>
          {member.level != null && <Text style={s.memberLevel}>Lv.{member.level}</Text>}
          <Text style={s.memberXp}>⚡ {(member.contribution_xp ?? 0).toLocaleString()} XP</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SocialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>('friends');
  const [friendsData, setFriendsData] = useState<FriendsResult | null>(null);
  const [crewData, setCrewData] = useState<MyCrewResult | null>(null);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingCrew, setLoadingCrew] = useState(true);
  const [refreshingFriends, setRefreshingFriends] = useState(false);
  const [refreshingCrew, setRefreshingCrew] = useState(false);

  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  }, []);

  const loadFriends = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshingFriends(true);
      else setLoadingFriends(true);
      const data = await getFriends();
      setFriendsData(data);
    } catch {
      /* silently fail, user can pull-to-refresh */
    } finally {
      setLoadingFriends(false);
      setRefreshingFriends(false);
    }
  }, []);

  const loadCrew = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshingCrew(true);
      else setLoadingCrew(true);
      const data = await getMyCrew();
      setCrewData(data);
    } catch {
      /* silently fail */
    } finally {
      setLoadingCrew(false);
      setRefreshingCrew(false);
    }
  }, []);

  useEffect(() => {
    loadFriends();
    loadCrew();
  }, [loadFriends, loadCrew]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'friends', label: '친구' },
    { key: 'crew', label: '크루' },
  ];

  const pendingCount = friendsData?.pending_requests?.length ?? 0;

  return (
    <KeyboardAvoidingView
      style={[s.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>소셜</Text>
        <View style={s.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[s.tab, active && s.tabActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab(tab.key);
              }}
            >
              <Text style={[s.tabText, active && s.tabTextActive]}>{tab.label}</Text>
              {tab.key === 'friends' && pendingCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{pendingCount}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Toast */}
      <Toast message={toastMsg} type={toastType} visible={toastVisible} />

      {/* Content */}
      {activeTab === 'friends' ? (
        <FriendsTab
          data={friendsData}
          loading={loadingFriends}
          refreshing={refreshingFriends}
          onRefresh={() => loadFriends(true)}
          onShowToast={showToast}
        />
      ) : (
        <CrewTab
          data={crewData}
          loading={loadingCrew}
          refreshing={refreshingCrew}
          onRefresh={() => loadCrew(true)}
          onShowToast={showToast}
        />
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  headerSpacer: { width: 36 },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: SPACING.xs,
  },
  tabActive: { borderBottomColor: BRAND.primary },
  tabText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textMuted,
  },
  tabTextActive: { color: BRAND.primary },
  badge: {
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { fontSize: 11, fontWeight: FONT_WEIGHT.bold, color: '#FFF' },

  // Shared
  tabContent: { flex: 1 },
  tabContentInner: { padding: SPACING.lg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },

  // Location sharing toggle
  locationShareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'visible',
  },
  locationShareTextCol: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    paddingRight: SPACING.sm,
  },
  locationShareSwitchWrap: {
    flexShrink: 0,
    marginLeft: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationShareSwitchWrapIOS: {
    paddingLeft: SPACING.xs,
    paddingRight: SPACING.xs,
    paddingVertical: 2,
  },
  locationShareLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  locationShareDesc: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Search bar
  searchRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchBtn: {
    backgroundColor: BRAND.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: { opacity: 0.5 },
  searchBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#FFF' },

  // Friend row
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  friendInfo: { flex: 1 },
  friendName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  friendMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 2 },
  levelBadge: {
    backgroundColor: `${BRAND.primary}20`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  levelBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: BRAND.primary },
  charIcon: { fontSize: 16 },

  // Pending actions
  pendingActions: { flexDirection: 'row', gap: SPACING.sm },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.error}15`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.error}30`,
  },

  // Empty state
  emptyBox: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
  },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.lg },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: FONT_SIZE.md * 1.6,
  },

  // No crew
  noCrewContainer: { alignItems: 'center', paddingVertical: SPACING.xxl },
  noCrewEmoji: { fontSize: 56, marginBottom: SPACING.lg },
  noCrewTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  noCrewDesc: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: BRAND.primary,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.glow,
  },
  ctaPrimaryText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: '#FFF' },
  joinRow: { flexDirection: 'row', gap: SPACING.sm, width: '100%' },
  joinInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  joinBtn: {
    backgroundColor: BRAND.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#FFF' },

  // Crew view
  crewHeader: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.sm,
  },
  crewEmoji: { fontSize: 48, marginBottom: SPACING.md },
  crewName: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  crewDesc: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, textAlign: 'center' },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    ...SHADOWS.sm,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: SPACING.xs },
  statValue: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },

  // Invite card
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: `${BRAND.primary}30`,
    ...SHADOWS.sm,
  },
  inviteLeft: {},
  inviteLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  inviteCode: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: BRAND.primary, letterSpacing: 2 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: `${BRAND.primary}15`,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: `${BRAND.primary}30`,
  },
  copyBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: BRAND.primary },

  // Member row
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  crownIcon: { fontSize: 14 },
  memberName: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary, flexShrink: 1 },
  roleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 1,
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: SPACING.xs,
  },
  roleBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  memberMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: 2 },
  memberLevel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  memberXp: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },

  // Leave button
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    marginTop: SPACING.xxl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: `${COLORS.error}30`,
    backgroundColor: `${COLORS.error}08`,
  },
  leaveBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.error },
});
