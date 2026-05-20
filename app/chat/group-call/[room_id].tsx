import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RTCView } from 'react-native-webrtc';

import { MANGA, MANGA_BORDER, MANGA_RADIUS, FONT_FAMILY, SPACING } from '../../../src/config/theme';
import { MangaAvatar } from '../../../src/components/ui';
import { useGroupWebRTCCall, type PeerState } from '../../../src/hooks/useGroupWebRTCCall';
import { streamUrl } from '../../../src/utils/webrtcSignal';

function MainRemoteView({ peer }: { peer: PeerState | null }) {
  if (!peer) {
    return (
      <View style={styles.mainEmpty}>
        <MangaAvatar name="친구" size={82} />
        <Text style={styles.mainEmptyTitle} allowFontScaling={false}>상대를 기다리는 중</Text>
        <Text style={styles.mainEmptyText} allowFontScaling={false}>
          친구가 알림을 누르면 바로 연결돼요.
        </Text>
      </View>
    );
  }

  const remoteUrl = streamUrl(peer.stream);
  return (
    <View style={styles.mainVideo}>
      {remoteUrl ? (
        <RTCView streamURL={remoteUrl} style={styles.video} objectFit="cover" zOrder={0} />
      ) : (
        <View style={styles.mainEmpty}>
          <MangaAvatar name="친구" size={82} />
          <Text style={styles.mainEmptyTitle} allowFontScaling={false}>친구</Text>
          <Text style={styles.mainEmptyText} allowFontScaling={false}>
            {peer.connected ? '영상 대기 중' : '연결 중'}
          </Text>
        </View>
      )}
      <View style={styles.nameBadge}>
        <Text style={styles.nameBadgeText} allowFontScaling={false}>친구</Text>
      </View>
    </View>
  );
}

function PeerPill({ peer, index }: { peer: PeerState; index: number }) {
  return (
    <View style={styles.peerPill}>
      <View style={[styles.peerDot, peer.connected ? styles.peerDotOn : null]} />
      <Text style={styles.peerPillText} numberOfLines={1} allowFontScaling={false}>
        친구 {index + 2}
      </Text>
    </View>
  );
}

export default function GroupCallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ room_id: string }>();
  const roomId = typeof params.room_id === 'string' ? params.room_id : '';
  const [ending, setEnding] = useState(false);

  const {
    localStream,
    peers,
    micOn,
    cameraOn,
    ready,
    callError,
    participantCount,
    toggleMic,
    toggleCamera,
    switchCamera,
    endCall,
  } = useGroupWebRTCCall(roomId);

  const localUrl = useMemo(() => streamUrl(localStream), [localStream]);
  const mainPeer = peers[0] ?? null;
  const extraPeers = peers.slice(1, 4);

  const handleToggleMic = useCallback(() => {
    toggleMic();
    void Haptics.selectionAsync();
  }, [toggleMic]);

  const handleToggleCamera = useCallback(() => {
    toggleCamera();
    void Haptics.selectionAsync();
  }, [toggleCamera]);

  const handleSwitchCamera = useCallback(() => {
    switchCamera();
    void Haptics.selectionAsync();
  }, [switchCamera]);

  const leave = useCallback(async () => {
    if (ending) return;
    setEnding(true);
    try {
      await endCall();
      router.back();
    } catch (error) {
      Alert.alert('오류', error instanceof Error ? error.message : '영상 방을 종료하지 못했어요.');
      setEnding(false);
    }
  }, [endCall, ending, router]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={leave} style={styles.headerButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={MANGA.paper} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} allowFontScaling={false}>단체 영상</Text>
          <Text style={styles.headerSub} allowFontScaling={false}>
            {participantCount > 0 ? `${participantCount}명 참여 중` : '연결 준비 중'}
          </Text>
        </View>
        <Pressable onPress={handleSwitchCamera} style={styles.headerButton} hitSlop={8}>
          <Ionicons name="camera-reverse-outline" size={22} color={MANGA.paper} />
        </Pressable>
      </View>

      <View style={styles.stage}>
        <MainRemoteView peer={mainPeer} />

        <View style={styles.callInfo}>
          <Text style={styles.callInfoTitle} allowFontScaling={false}>
            {callError ? '연결 오류' : ready ? '통화 연결 중' : '통화방 준비 중'}
          </Text>
          <Text style={styles.callInfoText} numberOfLines={2} allowFontScaling={false}>
            {callError ?? `${Math.max(participantCount, 1)}명 참여 중`}
          </Text>
        </View>

        <View style={styles.localPreview}>
          {localUrl && cameraOn ? (
            <RTCView streamURL={localUrl} style={styles.video} mirror objectFit="cover" zOrder={1} />
          ) : (
            <View style={styles.videoEmpty}>
              <MangaAvatar name="나" size={64} />
              <Text style={styles.videoEmptyText} allowFontScaling={false}>카메라 꺼짐</Text>
            </View>
          )}
          <View style={styles.nameBadge}>
            <Text style={styles.nameBadgeText} allowFontScaling={false}>나</Text>
          </View>
        </View>

        {extraPeers.length > 0 ? (
          <View style={styles.peerStrip}>
            {extraPeers.map((peer, index) => (
              <PeerPill key={peer.id} peer={peer} index={index} />
            ))}
          </View>
        ) : null}

        {!ready ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={MANGA.ink} />
            <Text style={styles.loadingText} allowFontScaling={false}>통화방을 여는 중이에요</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.controlsWrap, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={[styles.roundControl, !micOn && styles.controlOff]} onPress={handleToggleMic}>
          <Ionicons name={micOn ? 'mic' : 'mic-off'} size={24} color={MANGA.paper} />
          <Text style={styles.controlText} allowFontScaling={false}>마이크</Text>
        </Pressable>
        <Pressable style={[styles.roundControl, !cameraOn && styles.controlOff]} onPress={handleToggleCamera}>
          <Ionicons name={cameraOn ? 'videocam' : 'videocam-off'} size={24} color={MANGA.paper} />
          <Text style={styles.controlText} allowFontScaling={false}>카메라</Text>
        </Pressable>
        <Pressable onPress={leave} disabled={ending} style={[styles.endRoundButton, ending && styles.disabled]}>
          {ending ? (
            <ActivityIndicator color={MANGA.paper} />
          ) : (
            <>
              <Ionicons name="call" size={28} color={MANGA.paper} />
              <Text style={styles.endText} allowFontScaling={false}>종료</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: '#121212',
  },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { color: MANGA.paper, fontSize: 18, fontFamily: FONT_FAMILY.primaryBold },
  headerSub: { color: MANGA.paper, opacity: 0.65, fontSize: 11, fontFamily: FONT_FAMILY.primaryBold, marginTop: 2 },
  stage: { flex: 1, position: 'relative', paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  mainVideo: {
    flex: 1,
    borderWidth: MANGA_BORDER.width,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 24,
    backgroundColor: '#1E1E1E',
    overflow: 'hidden',
    position: 'relative',
  },
  video: { width: '100%', height: '100%' },
  mainEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: '#1E1E1E', padding: SPACING.xl },
  mainEmptyTitle: { color: MANGA.paper, fontSize: 20, fontFamily: FONT_FAMILY.primaryBold, marginTop: SPACING.xs },
  mainEmptyText: { color: MANGA.paper, opacity: 0.62, fontSize: 13, fontFamily: FONT_FAMILY.primary, textAlign: 'center', lineHeight: 19 },
  callInfo: {
    position: 'absolute',
    left: SPACING.xl,
    right: 152,
    top: SPACING.lg,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  callInfoTitle: { color: MANGA.paper, fontSize: 13, fontFamily: FONT_FAMILY.primaryBold },
  callInfoText: { color: MANGA.paper, opacity: 0.7, fontSize: 11, fontFamily: FONT_FAMILY.primary, marginTop: 2 },
  localPreview: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.xl,
    width: 118,
    height: 164,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    backgroundColor: MANGA.ink,
    overflow: 'hidden',
  },
  videoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: MANGA.paper },
  videoEmptyText: { color: MANGA.ink, opacity: 0.58, fontSize: 12, fontFamily: FONT_FAMILY.primaryBold },
  nameBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    borderWidth: 2,
    borderColor: MANGA.ink,
    borderRadius: 999,
    backgroundColor: MANGA.y,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  nameBadgeText: { color: MANGA.ink, fontSize: 11, fontFamily: FONT_FAMILY.primaryBold },
  peerStrip: {
    position: 'absolute',
    left: SPACING.xl,
    right: SPACING.xl,
    bottom: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  peerPill: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.46)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  peerDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: MANGA.r },
  peerDotOn: { backgroundColor: MANGA.g },
  peerPillText: { color: MANGA.paper, fontSize: 12, fontFamily: FONT_FAMILY.primaryBold, flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 190,
    marginLeft: -95,
    marginTop: -45,
    borderRadius: MANGA_RADIUS.card,
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  loadingText: { color: MANGA.ink, fontSize: 12, fontFamily: FONT_FAMILY.primaryBold },
  controlsWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: '#121212',
  },
  roundControl: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlOff: { backgroundColor: 'rgba(255,71,87,0.72)' },
  controlText: { color: MANGA.paper, fontSize: 10, fontFamily: FONT_FAMILY.primaryBold, marginTop: 3 },
  endRoundButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: MANGA.r,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.55 },
  endText: { color: MANGA.paper, fontSize: 10, fontFamily: FONT_FAMILY.primaryBold, marginTop: 3 },
});
