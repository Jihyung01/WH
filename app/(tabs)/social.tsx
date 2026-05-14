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
  Share,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
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
  listSocialStories,
  uploadSocialStoryPhoto,
  createSocialStory,
} from '../../src/lib/api';
import {
  startLocationSharing,
  stopLocationSharing,
  isLocationSharingActive,
  getLocationSharingStatus,
  getFriendLocationsSafe,
  subscribeToFriendLocations,
} from '../../src/services/friendLocation';
import type { FriendLocation } from '../../src/services/friendLocation';
import { reverseGeocodeToDistrict } from '../../src/utils/reverseGeocodeDistrict';
import { formatRelativeDate } from '../../src/utils/format';
import { useAuthStore } from '../../src/stores/authStore';
import {
  sendKakaoTextToFriends,
  shareKakaoText,
} from '../../src/services/kakaoShare';
import { pickKakaoFriends } from '../../src/services/kakaoFriends';
import { captureError } from '../../src/utils/errorReporting';
import type { FriendsResult, FriendInfo, MyCrewResult, CrewMember, SocialStory, SocialStoryVisibility } from '../../src/lib/api';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BRAND,
  BORDER_RADIUS,
  SHADOWS,
} from '../../src/config/theme';

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

function imageAssetToUploadUri(asset: ImagePicker.ImagePickerAsset): string {
  if (!asset.base64) return asset.uri;
  return `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
}

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
    backgroundColor: '#FF4757',
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    zIndex: 100,
    ...SHADOWS.md,
  },
  error: { backgroundColor: '#FF4757' },
  text: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: '#FFF', flex: 1 },
});

function AvatarCircle({ username, avatarUrl, size = 44 }: { username: string; avatarUrl?: string | null; size?: number }) {
  const letter = (username ?? '?')[0].toUpperCase();
  const hue = username ? username.charCodeAt(0) * 7 % 360 : 0;
  if (avatarUrl && avatarUrl.trim().length > 4) {
    return (
      <Image
        source={{ uri: avatarUrl.trim() }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
      />
    );
  }
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

function StoryRail({
  stories,
  viewerId,
  onCreate,
  onOpen,
}: {
  stories: SocialStory[];
  viewerId: string | null;
  onCreate: () => void;
  onOpen: (story: SocialStory) => void;
}) {
  const storyByUser = new Map<string, SocialStory>();
  for (const story of stories) {
    if (!storyByUser.has(story.user_id)) storyByUser.set(story.user_id, story);
  }
  const latestStories = Array.from(storyByUser.values()).sort((a, b) => {
    if (a.user_id === viewerId) return -1;
    if (b.user_id === viewerId) return 1;
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
  return (
    <View style={s.storySection}>
      <View style={s.sectionHeaderRow}>
        <Text style={s.socialSectionTitle}>스토리 🎬</Text>
        <Text style={s.sectionMore}>24시간</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.storyRail}>
        <Pressable
          style={s.storyItem}
          onPress={onCreate}
        >
          <View style={[s.storyRing, s.storyAdd]}>
            <Text style={s.storyAddText}>+</Text>
          </View>
          <Text style={s.storyName} numberOfLines={1}>스토리</Text>
        </Pressable>
        {latestStories.map((story, index) => (
          <Pressable key={story.id} style={s.storyItem} onPress={() => onOpen(story)}>
            <View style={[s.storyRing, index > 5 && s.storyViewed]}>
              <Image source={{ uri: story.photo_url }} style={s.storyThumb} contentFit="cover" />
            </View>
            <Text style={s.storyName} numberOfLines={1}>
              {story.user_id === viewerId ? '내 스토리' : story.username ?? '친구'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function StoryCreateModal({
  visible,
  onClose,
  onCreated,
  onShowToast,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (story: SocialStory) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const insets = useSafeAreaInsets();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<SocialStoryVisibility>('friends');
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setPhotoUri(null);
    setCaption('');
    setVisibility('friends');
  }, []);

  const pickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '스토리에 사진을 올리려면 사진 권한이 필요해요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.86,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    setPhotoUri(imageAssetToUploadUri(result.assets[0]));
  }, []);

  const submit = useCallback(async () => {
    if (!photoUri || submitting) return;
    setSubmitting(true);
    try {
      const photoUrl = await uploadSocialStoryPhoto(photoUri);
      const story = await createSocialStory({
        photoUrl,
        caption: caption.trim() || null,
        visibility,
      });
      onCreated(story);
      reset();
      onClose();
      onShowToast('스토리를 올렸어요.', 'success');
    } catch {
      onShowToast('스토리 업로드에 실패했어요.', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [caption, onClose, onCreated, onShowToast, photoUri, reset, submitting, visibility]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={storyModalStyles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={storyModalStyles.kav}>
          <View style={[storyModalStyles.sheet, { paddingBottom: insets.bottom + 18 }]}>
            <View style={storyModalStyles.header}>
              <Text style={storyModalStyles.title} allowFontScaling={false}>새 스토리</Text>
              <Pressable onPress={() => { reset(); onClose(); }} hitSlop={12}>
                <Ionicons name="close" size={24} color="#1A1612" />
              </Pressable>
            </View>

            <Pressable style={storyModalStyles.photoBox} onPress={pickPhoto}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={storyModalStyles.photo} contentFit="cover" />
              ) : (
                <View style={storyModalStyles.photoEmpty}>
                  <Ionicons name="camera" size={34} color="#1A1612" />
                  <Text style={storyModalStyles.photoHint} allowFontScaling={false}>사진 선택</Text>
                </View>
              )}
            </Pressable>

            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="오늘의 한 장을 짧게 남겨보세요"
              placeholderTextColor="rgba(26,22,18,0.45)"
              style={storyModalStyles.captionInput}
              maxLength={80}
              allowFontScaling={false}
            />

            <View style={storyModalStyles.visibilityRow}>
              {[
                { value: 'friends' as const, label: '친구만' },
                { value: 'public' as const, label: '전체공개' },
              ].map((option) => (
                <Pressable
                  key={option.value}
                  style={[storyModalStyles.visibilityButton, visibility === option.value && storyModalStyles.visibilityButtonActive]}
                  onPress={() => setVisibility(option.value)}
                >
                  <Text style={[storyModalStyles.visibilityText, visibility === option.value && storyModalStyles.visibilityTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[storyModalStyles.submitButton, (!photoUri || submitting) && storyModalStyles.submitButtonDisabled]}
              onPress={submit}
              disabled={!photoUri || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#1A1612" />
              ) : (
                <Text style={storyModalStyles.submitText} allowFontScaling={false}>24시간 스토리 올리기</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function StoryViewerModal({
  story,
  onClose,
}: {
  story: SocialStory | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={story !== null} animationType="fade" transparent>
      <View style={storyViewerStyles.overlay}>
        <Pressable style={storyViewerStyles.closeButton} onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={26} color="#FFFEF5" />
        </Pressable>
        {story ? (
          <View style={storyViewerStyles.card}>
            <Image source={{ uri: story.photo_url }} style={storyViewerStyles.image} contentFit="cover" />
            <View style={storyViewerStyles.meta}>
              <AvatarCircle username={story.username ?? '친구'} avatarUrl={story.avatar_url} size={34} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={storyViewerStyles.name} allowFontScaling={false} numberOfLines={1}>
                  {story.username ?? '친구'}
                </Text>
                {story.caption ? (
                  <Text style={storyViewerStyles.caption} allowFontScaling={false} numberOfLines={2}>
                    {story.caption}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function RadarPanel({
  friends,
  friendLocations,
  districtByUserId,
  onOpenFriendProfile,
}: {
  friends: FriendInfo[];
  friendLocations: FriendLocation[];
  districtByUserId: Map<string, string>;
  onOpenFriendProfile: (userId: string) => void;
}) {
  const pins = friends.slice(0, 4);
  const positions: Array<{ left: `${number}%`; top: `${number}%` }> = [
    { left: '24%', top: '30%' },
    { left: '72%', top: '34%' },
    { left: '78%', top: '70%' },
    { left: '18%', top: '74%' },
  ];

  return (
    <View style={s.radarSection}>
      <View style={s.sectionHeaderRow}>
        <Text style={s.socialSectionTitle}>레이더 📡</Text>
        <Text style={s.sectionMore}>지도 →</Text>
      </View>
      <View style={s.radarWrap}>
        <View style={[s.radarRing, s.radarRingOuter]} />
        <View style={[s.radarRing, s.radarRingMiddle]} />
        <View style={[s.radarRing, s.radarRingInner]} />
        <View style={s.radarMe}>
          <Text style={s.radarMeText}>나</Text>
        </View>
        {pins.map((friend, index) => {
          const loc = friendLocations.find((item) => item.user_id === friend.user_id);
          const district = loc ? districtByUserId.get(friend.user_id) : null;
          const label = district ?? (friend.location_sharing ? '공유 중' : '고스트');
          return (
            <Pressable
              key={friend.user_id}
              style={[s.radarPin, positions[index]]}
              onPress={() => onOpenFriendProfile(friend.user_id)}
            >
              <Text style={s.radarPinText}>{friend.username[0] ?? '?'}</Text>
              <View style={s.radarPinLabel}>
                <Text style={s.radarPinLabelText} numberOfLines={1}>{label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={s.socialSegment}>
        <Text style={[s.socialSegmentText, s.socialSegmentActive]}>근처 {friendLocations.length}명</Text>
        <Text style={s.socialSegmentText}>온라인 {friends.length}</Text>
        <Text style={s.socialSegmentText}>전체</Text>
      </View>
    </View>
  );
}

function SocialChallengeCard() {
  return (
    <View style={s.challengeCard}>
      <View style={s.challengeIcon}>
        <Text style={s.challengeIconText}>☕</Text>
      </View>
      <View style={s.challengeMeta}>
        <Text style={s.challengeTitle} numberOfLines={1}>정자동 카페 5곳 가기</Text>
        <Text style={s.challengeSub}>남은 4일 · 보상 +120 EXP</Text>
        <View style={s.challengeProgressTrack}>
          <View style={s.challengeProgressFill} />
        </View>
      </View>
      <Text style={s.challengeCount}>3/5</Text>
    </View>
  );
}

// ─── Friends Tab ─────────────────────────────────────────────────────────────

function FriendsTab({
  data,
  loading,
  refreshing,
  onRefresh,
  onShowToast,
  friendLocations,
  districtByUserId,
  onOpenFriendProfile,
  stories,
  viewerId,
  onCreateStory,
  onOpenStory,
}: {
  data: FriendsResult | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
  friendLocations: FriendLocation[];
  districtByUserId: Map<string, string>;
  onOpenFriendProfile: (userId: string) => void;
  stories: SocialStory[];
  viewerId: string | null;
  onCreateStory: () => void;
  onOpenStory: (story: SocialStory) => void;
}) {
  const [searchText, setSearchText] = useState('');
  const [sending, setSending] = useState(false);
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set());
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(() => isLocationSharingActive());

  useEffect(() => {
    let mounted = true;
    (async () => {
      const enabled = await getLocationSharingStatus();
      if (mounted) setLocationSharingEnabled(enabled);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLocationToggle = async (value: boolean) => {
    if (value) {
      const granted = await startLocationSharing();
      setLocationSharingEnabled(granted);
      if (!granted) {
        onShowToast('앱 종료 중 공유를 위해 위치 "항상 허용"이 필요해요.', 'error');
        Alert.alert(
          '항상 허용 필요',
          '앱을 꺼도 친구에게 현재 위치를 공유하려면 위치 권한을 "항상 허용"으로 설정해야 해요.',
          [
            { text: '나중에', style: 'cancel' },
            {
              text: '설정 열기',
              onPress: () => {
                void Linking.openSettings();
              },
            },
          ],
        );
      }
      if (granted) {
        const bg = await Location.getBackgroundPermissionsAsync();
        if (bg.status !== 'granted') {
          Alert.alert(
            '백그라운드 위치 권한 필요',
            '친구 위치를 더 정확하게 실시간으로 공유하려면 위치 권한을 "항상 허용"으로 설정해 주세요.',
            [
              { text: '나중에', style: 'cancel' },
              {
                text: '설정 열기',
                onPress: () => {
                  void Linking.openSettings();
                },
              },
            ],
          );
        }
      }
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

  const handleRespond = async (friendshipId: string, accept: boolean, requesterId?: string) => {
    try {
      setRespondingIds((prev) => new Set(prev).add(friendshipId));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await respondFriendRequest(friendshipId, accept, requesterId);
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
        <ActivityIndicator size="large" color={'#FF4757'} />
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={'#FF4757'} colors={['#FF4757']} />}
      keyboardShouldPersistTaps="handled"
    >
      <StoryRail
        stories={stories}
        viewerId={viewerId}
        onCreate={onCreateStory}
        onOpen={onOpenStory}
      />
      <RadarPanel
        friends={friends}
        friendLocations={friendLocations}
        districtByUserId={districtByUserId}
        onOpenFriendProfile={onOpenFriendProfile}
      />

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
            trackColor={{ false: '#FFF5DC', true: '#FF4757' }}
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
          placeholderTextColor={'rgba(26,22,18,0.5)'}
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
              <AvatarCircle username={req.username} avatarUrl={req.avatar_url} />
              <Text style={s.friendName} numberOfLines={1}>{req.username}</Text>
              <View style={s.pendingActions}>
                <Pressable
                  style={s.acceptBtn}
                  onPress={() => handleRespond(req.friendship_id, true, req.user_id)}
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
                  <Ionicons name="close" size={18} color={'#FF4757'} />
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
          friends.map((friend, idx) => {
            const loc = friendLocations.find((l) => l.user_id === friend.user_id);
            const district = loc ? districtByUserId.get(friend.user_id) : undefined;
            const sharing = friend.location_sharing === true;
            let locationSub: string | null = null;
            if (sharing) {
              if (loc && district) {
                locationSub = `📍 ${district} · ${formatRelativeDate(loc.last_seen_at)}`;
              } else {
                locationSub = '📍 공유 중 · 최근 위치 없음';
              }
            }

            return (
              <Animated.View key={friend.friendship_id} entering={FadeInUp.duration(250).delay(idx * 40)}>
                <Pressable
                  style={s.friendRow}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onOpenFriendProfile(friend.user_id);
                  }}
                >
                  <AvatarCircle username={friend.username} avatarUrl={friend.avatar_url} />
                  <View style={s.friendInfo}>
                    <Text style={s.friendName} numberOfLines={1}>
                      {friend.username}
                    </Text>
                    {locationSub ? (
                      <Text style={s.friendLocationSub} numberOfLines={1}>
                        {locationSub}
                      </Text>
                    ) : null}
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
                  <Ionicons name="chevron-forward" size={18} color={'rgba(26,22,18,0.5)'} />
                </Pressable>
              </Animated.View>
            );
          })
        )}
      </Animated.View>

      <View style={s.sectionHeaderRow}>
        <Text style={s.socialSectionTitle}>진행 중인 챌린지</Text>
        <Text style={s.sectionMore}>전체 →</Text>
      </View>
      <SocialChallengeCard />
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
        <ActivityIndicator size="large" color={'#FF4757'} />
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
            placeholderTextColor={'rgba(26,22,18,0.5)'}
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
                <Ionicons name="close" size={24} color={'rgba(26,22,18,0.65)'} />
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
                placeholderTextColor={'rgba(26,22,18,0.5)'}
                maxLength={20}
              />

              <Text style={modalStyles.label}>소개</Text>
              <TextInput
                style={[modalStyles.input, modalStyles.inputMulti]}
                value={description}
                onChangeText={setDescription}
                placeholder="크루를 소개해주세요"
                placeholderTextColor={'rgba(26,22,18,0.5)'}
                multiline
                maxLength={100}
              />

              <Text style={modalStyles.label}>홈 지역</Text>
              <Pressable style={modalStyles.districtBtn} onPress={() => setShowDistrictPicker(!showDistrictPicker)}>
                <Text style={district ? modalStyles.districtText : modalStyles.districtPlaceholder}>
                  {district || '지역 선택 (선택사항)'}
                </Text>
                <Ionicons name={showDistrictPicker ? 'chevron-up' : 'chevron-down'} size={18} color={'rgba(26,22,18,0.65)'} />
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
    backgroundColor: '#FFFEF5',
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF5DC',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: '#1A1612' },
  label: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: 'rgba(26,22,18,0.65)', marginBottom: SPACING.sm, marginTop: SPACING.lg },
  input: {
    backgroundColor: '#FFF5DC',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: '#1A1612',
    borderWidth: 2,
    borderColor: '#1A1612',
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#FFF5DC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiBtnActive: { borderColor: '#FF4757', backgroundColor: `${'#FF4757'}15` },
  emojiText: { fontSize: 22 },
  districtBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF5DC',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 2,
    borderColor: '#1A1612',
  },
  districtText: { fontSize: FONT_SIZE.md, color: '#1A1612' },
  districtPlaceholder: { fontSize: FONT_SIZE.md, color: 'rgba(26,22,18,0.5)' },
  districtList: { maxHeight: 180, backgroundColor: '#FFF5DC', borderRadius: BORDER_RADIUS.md, marginTop: SPACING.sm },
  districtItem: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  districtItemActive: { backgroundColor: `${'#FF4757'}15` },
  districtItemText: { fontSize: FONT_SIZE.md, color: '#1A1612' },
  districtItemTextActive: { color: '#FF4757', fontWeight: FONT_WEIGHT.semibold },
  createBtn: {
    backgroundColor: '#FF4757',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.xl,
    
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: '#FFF' },
});

const storyModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(26,22,18,0.55)', justifyContent: 'flex-end' },
  kav: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFEF5',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 2.5,
    borderColor: '#1A1612',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { color: '#1A1612', fontSize: 19, fontWeight: '900' },
  photoBox: {
    height: 360,
    borderWidth: 2.5,
    borderColor: '#1A1612',
    borderRadius: 18,
    backgroundColor: '#FFF5DC',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  photoEmpty: { alignItems: 'center', gap: 8 },
  photoHint: { color: '#1A1612', fontSize: 14, fontWeight: '900' },
  captionInput: {
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#1A1612',
    borderRadius: 12,
    backgroundColor: '#FFFEF5',
    color: '#1A1612',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  visibilityButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#1A1612',
    borderRadius: 12,
    backgroundColor: '#FFFEF5',
    alignItems: 'center',
    paddingVertical: 10,
  },
  visibilityButtonActive: { backgroundColor: '#FFD93D' },
  visibilityText: { color: '#1A1612', fontSize: 13, fontWeight: '900' },
  visibilityTextActive: { color: '#1A1612' },
  submitButton: {
    marginTop: 12,
    height: 52,
    borderWidth: 2.5,
    borderColor: '#1A1612',
    borderRadius: 13,
    backgroundColor: '#3DDC97',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: { opacity: 0.45 },
  submitText: { color: '#1A1612', fontSize: 15, fontWeight: '900' },
});

const storyViewerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  closeButton: {
    position: 'absolute',
    top: 54,
    right: 20,
    zIndex: 2,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    aspectRatio: 9 / 16,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: '#FFFEF5',
    backgroundColor: '#1A1612',
  },
  image: { width: '100%', height: '100%' },
  meta: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(26,22,18,0.72)',
    padding: 10,
  },
  name: { color: '#FFFEF5', fontSize: 13, fontWeight: '900' },
  caption: { color: 'rgba(255,254,245,0.9)', fontSize: 12, fontWeight: '700', marginTop: 2 },
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
  const [inviting, setInviting] = useState(false);
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

  const handleShareInvite = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const message = `WhereHere에서 \"${crew.name}\" 크루에 함께해요!\n\n초대 코드: ${crew.invite_code}\n\n앱에서 바로 가입하기:\nwherehere://join?code=${crew.invite_code}`;

      try {
        await shareKakaoText({
          text: message,
          buttonTitle: '크루 가입하기',
          linkParams: {
            iosExecutionParams: { screen: 'join', code: crew.invite_code },
            androidExecutionParams: { screen: 'join', code: crew.invite_code },
          },
        });
      } catch {
        await Share.share({ message });
      }
    } catch {
      // user cancelled
    }
  };

  const handleInviteKakaoFriends = async () => {
    try {
      setInviting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const text = `WhereHere에서 \"${crew.name}\" 크루에 함께해요!\n\n초대 코드: ${crew.invite_code}\n\n앱에서 바로 가입하기:\nwherehere://join?code=${crew.invite_code}`;
      const storeUrl = Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/id6761450806'
        : 'https://play.google.com/store/apps/details?id=com.wherehere.app';
      const linkParams = {
        iosExecutionParams: { screen: 'join', code: crew.invite_code },
        androidExecutionParams: { screen: 'join', code: crew.invite_code },
        webUrl: storeUrl,
        mobileWebUrl: storeUrl,
      };

      /**
       * iOS New Architecture: @react-native-kakao/social + user + core TurboModules still throw NSException
       * (see ObjCTurboModule::performVoidMethodInvocation). Never open the native friend picker on iOS.
       */
      if (Platform.OS === 'ios') {
        try {
          await shareKakaoText({
            text,
            buttonTitle: '크루 가입하기',
            linkParams,
          });
        } catch {
          await Share.share({ message: text });
        }
        onShowToast('공유 시트에서 카카오톡을 선택해 초대를 보내 주세요.', 'success');
        return;
      }

      const picked = await pickKakaoFriends({ maxPickableCount: 20 });
      const receiverUuids = (picked.users ?? []).map((u) => u.uuid).filter(Boolean);
      if (receiverUuids.length === 0) {
        onShowToast('초대할 친구를 선택해 주세요.', 'error');
        return;
      }

      const sent = await sendKakaoTextToFriends({
        text,
        receiverUuids,
        buttonTitle: '크루 가입하기',
        linkParams,
      });
      const count = Array.isArray(sent) ? sent.length : receiverUuids.length;
      onShowToast(`카카오톡으로 ${count}명에게 초대를 보냈어요!`, 'success');
    } catch (e) {
      captureError(e, {
        flow: 'kakao_crew_invite',
        crewId: crew.id,
      });
      console.warn('Kakao invite failed:', e);
      onShowToast('카카오톡 친구 초대에 실패했어요. (권한/카카오톡 설치 확인)', 'error');
    } finally {
      setInviting(false);
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={'#FF4757'} colors={['#FF4757']} />}
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
          <Ionicons name="trending-up" size={18} color={'#FF4757'} />
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
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          <Pressable style={s.copyBtn} onPress={handleCopyCode}>
            <Ionicons name="copy-outline" size={18} color={'#FF4757'} />
            <Text style={s.copyBtnText}>복사</Text>
          </Pressable>
          <Pressable style={s.copyBtn} onPress={handleShareInvite}>
            <Ionicons name="share-social-outline" size={18} color={'#FF4757'} />
            <Text style={s.copyBtnText}>공유</Text>
          </Pressable>
          <Pressable style={[s.copyBtn, inviting && { opacity: 0.6 }]} onPress={handleInviteKakaoFriends} disabled={inviting}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={'#FF4757'} />
            <Text style={s.copyBtnText}>{inviting ? '전송...' : '카톡초대'}</Text>
          </Pressable>
        </View>
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
            <ActivityIndicator size="small" color={'#FF4757'} />
          ) : (
            <>
              <Ionicons name="exit-outline" size={18} color={'#FF4757'} />
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
    member: { text: '멤버', color: 'rgba(26,22,18,0.5)' },
  };
  const role = roleLabels[member.role] ?? roleLabels.member;

  return (
    <View style={s.memberRow}>
      <AvatarCircle username={member.username} avatarUrl={member.avatar_url} />
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
  const viewerId = useAuthStore((s) => s.user?.id ?? null);

  const [activeTab, setActiveTab] = useState<TabKey>('friends');
  const [friendsData, setFriendsData] = useState<FriendsResult | null>(null);
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([]);
  const [districtByUserId, setDistrictByUserId] = useState<Map<string, string>>(new Map());
  const [crewData, setCrewData] = useState<MyCrewResult | null>(null);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingCrew, setLoadingCrew] = useState(true);
  const [stories, setStories] = useState<SocialStory[]>([]);
  const [storyCreateOpen, setStoryCreateOpen] = useState(false);
  const [activeStory, setActiveStory] = useState<SocialStory | null>(null);
  const [refreshingFriends, setRefreshingFriends] = useState(false);
  const [refreshingCrew, setRefreshingCrew] = useState(false);

  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [toastVisible, setToastVisible] = useState(false);
  const friendPollMs = Platform.OS === 'android' ? 7_000 : 15_000;

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

  const loadStories = useCallback(async () => {
    try {
      const next = await listSocialStories();
      setStories(next);
    } catch {
      /* stories are optional; pull-to-refresh can retry */
    }
  }, []);

  useEffect(() => {
    loadFriends();
    loadCrew();
    loadStories();
  }, [loadFriends, loadCrew, loadStories]);

  const friendIdsKey =
    friendsData?.friends
      ?.map((f) => f.user_id)
      .sort()
      .join(',') ?? '';

  useEffect(() => {
    if (!viewerId || !friendsData?.friends?.length) {
      setFriendLocations([]);
      return;
    }
    let cancelled = false;
    const ids = friendsData.friends.map((f) => f.user_id);
    const unsubRef: { current: (() => void) | null } = { current: null };

    void (async () => {
      const locs = await getFriendLocationsSafe(viewerId);
      if (cancelled) return;
      if (locs) setFriendLocations(locs);
      if (cancelled) return;
      unsubRef.current = subscribeToFriendLocations(ids, viewerId, (next) => {
        if (!cancelled) setFriendLocations(next);
      });
    })();

    const poll = setInterval(() => {
      if (cancelled) return;
      void (async () => {
        const locs = await getFriendLocationsSafe(viewerId);
        if (!cancelled && locs) setFriendLocations(locs);
      })();
    }, friendPollMs);

    return () => {
      cancelled = true;
      unsubRef.current?.();
      unsubRef.current = null;
      clearInterval(poll);
    };
  }, [viewerId, friendIdsKey, friendPollMs]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = new Map<string, string>();
      for (const loc of friendLocations) {
        const label = await reverseGeocodeToDistrict(loc.latitude, loc.longitude);
        if (!cancelled) next.set(loc.user_id, label);
      }
      if (!cancelled) setDistrictByUserId(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [friendLocations]);

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
        <View>
          <Text style={s.headerTitle}>친구들 👥</Text>
          <Text style={s.headerSubtitle}>위치와 이야기가 모이는 곳</Text>
        </View>
        <View style={s.ghostPill}>
          <View style={s.ghostLed} />
          <Text style={s.ghostText}>고스트 OFF</Text>
        </View>
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
          onRefresh={() => {
            void loadStories();
            void loadFriends(true);
          }}
          onShowToast={showToast}
          friendLocations={friendLocations}
          districtByUserId={districtByUserId}
          onOpenFriendProfile={(uid) => router.push(`/user/${uid}` as any)}
          stories={stories}
          viewerId={viewerId}
          onCreateStory={() => setStoryCreateOpen(true)}
          onOpenStory={setActiveStory}
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

      <StoryCreateModal
        visible={storyCreateOpen}
        onClose={() => setStoryCreateOpen(false)}
        onCreated={(story) => setStories((prev) => [story, ...prev.filter((item) => item.id !== story.id)])}
        onShowToast={showToast}
      />
      <StoryViewerModal story={activeStory} onClose={() => setActiveStory(null)} />
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── manga 톤 (Phase 4 surgical pass) ──
  container: { flex: 1, backgroundColor: '#FFF5DC' },

  // Header (manga: 종이 + 잉크 라인)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 2.5,
    borderBottomColor: '#1A1612',
    backgroundColor: '#FFFEF5',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFEF5',
    borderWidth: 2,
    borderColor: '#1A1612',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A1612',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    marginTop: 2,
    color: 'rgba(26,22,18,0.58)',
    fontSize: 11,
    fontWeight: '800',
  },
  headerSpacer: { width: 36 },
  ghostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: '#1A1612',
    borderRadius: 999,
    backgroundColor: '#FFD93D',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ghostLed: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#3DDC97',
    borderWidth: 1.5,
    borderColor: '#1A1612',
  },
  ghostText: {
    color: '#1A1612',
    fontSize: 10,
    fontWeight: '900',
  },

  // Tabs (manga: 종이 + 빨강 활성 underline)
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFEF5',
    borderBottomWidth: 2.5,
    borderBottomColor: '#1A1612',
    paddingHorizontal: SPACING.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: SPACING.xs,
  },
  tabActive: { borderBottomColor: '#FF4757' },
  tabText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: 'rgba(26,22,18,0.5)',
  },
  tabTextActive: { color: '#FF4757' },
  badge: {
    backgroundColor: '#FF4757',
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  socialSectionTitle: {
    color: '#1A1612',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  sectionMore: {
    color: '#FF4757',
    fontSize: 11,
    fontWeight: '900',
  },
  storySection: {
    marginBottom: SPACING.sm,
  },
  storyRail: {
    gap: 10,
    paddingVertical: 4,
    paddingRight: SPACING.lg,
  },
  storyItem: {
    width: 62,
    alignItems: 'center',
    gap: 4,
  },
  storyRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2.5,
    borderColor: '#1A1612',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4757',
    padding: 3,
    overflow: 'hidden',
  },
  storyThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
  },
  storyViewed: {
    backgroundColor: '#E8E0D2',
  },
  storyAdd: {
    backgroundColor: '#FFFEF5',
  },
  storyAddText: {
    color: '#1A1612',
    fontSize: 25,
    fontWeight: '900',
  },
  storyName: {
    width: '100%',
    textAlign: 'center',
    color: '#1A1612',
    fontSize: 10,
    fontWeight: '800',
  },
  radarSection: {
    marginBottom: SPACING.md,
  },
  radarWrap: {
    height: 190,
    borderWidth: 2.5,
    borderColor: '#1A1612',
    borderRadius: 18,
    backgroundColor: '#FFFEF5',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,71,87,0.35)',
    borderRadius: 999,
  },
  radarRingOuter: { width: 168, height: 168 },
  radarRingMiddle: { width: 112, height: 112 },
  radarRingInner: { width: 58, height: 58 },
  radarMe: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#1A1612',
    backgroundColor: '#FFD93D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarMeText: {
    color: '#1A1612',
    fontSize: 15,
    fontWeight: '900',
  },
  radarPin: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#1A1612',
    backgroundColor: '#3DDC97',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarPinText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
  },
  radarPinLabel: {
    position: 'absolute',
    top: 34,
    minWidth: 56,
    borderWidth: 1.5,
    borderColor: '#1A1612',
    borderRadius: 6,
    backgroundColor: '#FFFEF5',
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  radarPinLabelText: {
    color: '#1A1612',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
  socialSegment: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    borderWidth: 2.5,
    borderColor: '#1A1612',
    borderRadius: 12,
    backgroundColor: '#FFFEF5',
    padding: 3,
  },
  socialSegmentText: {
    flex: 1,
    textAlign: 'center',
    color: '#8B7355',
    fontSize: 11,
    fontWeight: '900',
    paddingVertical: 7,
    borderRadius: 9,
  },
  socialSegmentActive: {
    color: '#FFD93D',
    backgroundColor: '#1A1612',
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#1A1612',
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },

  // Location sharing toggle
  locationShareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: '#FFFEF5',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: '#1A1612',
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
  /** iOS UISwitch intrinsic size is wide; padding keeps the control visually inside the card. */
  locationShareSwitchWrapIOS: {
    paddingLeft: SPACING.xs,
    paddingRight: SPACING.xs,
    paddingVertical: 2,
  },
  locationShareLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: '#1A1612',
  },
  locationShareDesc: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(26,22,18,0.65)',
    marginTop: 2,
  },

  // Search bar
  searchRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFF5DC',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: '#1A1612',
    borderWidth: 2,
    borderColor: '#1A1612',
  },
  searchBtn: {
    backgroundColor: '#FF4757',
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
    backgroundColor: '#FFFEF5',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
    borderWidth: 2,
    borderColor: '#1A1612',
  },
  friendInfo: { flex: 1 },
  friendName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: '#1A1612',
    flex: 1,
  },
  friendLocationSub: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(26,22,18,0.65)',
    marginTop: 2,
  },
  friendMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 4 },
  levelBadge: {
    backgroundColor: `${'#FF4757'}20`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  levelBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: '#FF4757' },
  charIcon: { fontSize: 16 },

  // Pending actions
  pendingActions: { flexDirection: 'row', gap: SPACING.sm },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF4757',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${'#FF4757'}15`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: `${'#FF4757'}30`,
  },

  // Empty state
  emptyBox: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    backgroundColor: '#FFFEF5',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: '#1A1612',
  },
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2.5,
    borderColor: '#1A1612',
    borderRadius: 14,
    backgroundColor: '#FFFEF5',
    padding: 12,
  },
  challengeIcon: {
    width: 46,
    height: 46,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: '#1A1612',
    backgroundColor: '#FFD93D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeIconText: { fontSize: 24 },
  challengeMeta: { flex: 1, minWidth: 0 },
  challengeTitle: {
    color: '#1A1612',
    fontSize: 13,
    fontWeight: '900',
  },
  challengeSub: {
    color: '#8B7355',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  challengeProgressTrack: {
    height: 8,
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: '#1A1612',
    borderRadius: 6,
    backgroundColor: '#E8E0D2',
    overflow: 'hidden',
  },
  challengeProgressFill: {
    width: '60%',
    height: '100%',
    backgroundColor: '#FF4757',
    borderRightWidth: 1.5,
    borderRightColor: '#1A1612',
  },
  challengeCount: {
    color: '#FF4757',
    fontSize: 14,
    fontWeight: '900',
  },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.lg },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: 'rgba(26,22,18,0.65)',
    textAlign: 'center',
    lineHeight: FONT_SIZE.md * 1.6,
  },

  // No crew
  noCrewContainer: { alignItems: 'center', paddingVertical: SPACING.xxl },
  noCrewEmoji: { fontSize: 56, marginBottom: SPACING.lg },
  noCrewTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: '#1A1612', marginBottom: SPACING.sm },
  noCrewDesc: { fontSize: FONT_SIZE.md, color: 'rgba(26,22,18,0.65)', marginBottom: SPACING.xl },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#FF4757',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xl,
    
  },
  ctaPrimaryText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: '#FFF' },
  joinRow: { flexDirection: 'row', gap: SPACING.sm, width: '100%' },
  joinInput: {
    flex: 1,
    backgroundColor: '#FFF5DC',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: '#1A1612',
    borderWidth: 2,
    borderColor: '#1A1612',
  },
  joinBtn: {
    backgroundColor: '#FF4757',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#FFF' },

  // Crew view
  crewHeader: {
    alignItems: 'center',
    backgroundColor: '#FFFEF5',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.sm,
  },
  crewEmoji: { fontSize: 48, marginBottom: SPACING.md },
  crewName: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: '#1A1612', marginBottom: SPACING.xs },
  crewDesc: { fontSize: FONT_SIZE.md, color: 'rgba(26,22,18,0.65)', textAlign: 'center' },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFEF5',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    ...SHADOWS.sm,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: '#1A1612', marginVertical: SPACING.xs },
  statValue: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: '#1A1612' },
  statLabel: { fontSize: FONT_SIZE.xs, color: 'rgba(26,22,18,0.65)' },

  // Invite card
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFEF5',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 2,
    borderColor: `${'#FF4757'}30`,
    ...SHADOWS.sm,
  },
  inviteLeft: {},
  inviteLabel: { fontSize: FONT_SIZE.xs, color: 'rgba(26,22,18,0.65)', marginBottom: SPACING.xs },
  inviteCode: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: '#FF4757', letterSpacing: 2 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: `${'#FF4757'}15`,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 2,
    borderColor: `${'#FF4757'}30`,
  },
  copyBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: '#FF4757' },

  // Member row
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFEF5',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  crownIcon: { fontSize: 14 },
  memberName: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: '#1A1612', flexShrink: 1 },
  roleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 1,
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: SPACING.xs,
  },
  roleBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  memberMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: 2 },
  memberLevel: { fontSize: FONT_SIZE.xs, color: 'rgba(26,22,18,0.65)' },
  memberXp: { fontSize: FONT_SIZE.xs, color: 'rgba(26,22,18,0.65)' },

  // Leave button
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    marginTop: SPACING.xxl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: `${'#FF4757'}30`,
    backgroundColor: `${'#FF4757'}08`,
  },
  leaveBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: '#FF4757' },
});
