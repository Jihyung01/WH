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

function RemoteTile({ peer }: { peer: PeerState }) {
  const remoteUrl = streamUrl(peer.stream);
  return (
    <View style={styles.videoTile}>
      {remoteUrl ? (
        <RTCView streamURL={remoteUrl} style={styles.video} objectFit="cover" zOrder={0} />
      ) : (
        <View style={styles.videoEmpty}>
          <MangaAvatar name="친구" size={58} />
          <Text style={styles.videoEmptyText} allowFontScaling={false}>
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
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 18 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={MANGA.ink} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} allowFontScaling={false}>단체 영상</Text>
          <Text style={styles.headerSub} allowFontScaling={false}>
            {participantCount > 0 ? `${participantCount}명 참여 중` : '연결 준비 중'}
          </Text>
        </View>
        <Pressable onPress={handleSwitchCamera} style={styles.headerButton} hitSlop={8}>
          <Ionicons name="camera-reverse-outline" size={22} color={MANGA.ink} />
        </Pressable>
      </View>

      <View style={styles.stage}>
        <View style={[styles.videoTile, styles.localTile]}>
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

        {peers.map((peer) => <RemoteTile key={peer.id} peer={peer} />)}

        {!ready ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={MANGA.ink} />
            <Text style={styles.loadingText} allowFontScaling={false}>통화방을 여는 중이에요</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle} allowFontScaling={false}>
          {callError ? '연결 오류' : '앱 안에서 연결 중'}
        </Text>
        <Text style={styles.noticeText} allowFontScaling={false}>
          {callError ?? '카메라와 마이크는 기기에서 직접 처리되고, 방 연결 신호만 WhereHere 채팅방으로 주고받아요.'}
        </Text>
      </View>

      <View style={styles.controls}>
        <Pressable style={[styles.controlButton, !micOn && styles.controlOff]} onPress={handleToggleMic}>
          <Ionicons name={micOn ? 'mic' : 'mic-off'} size={22} color={MANGA.ink} />
          <Text style={styles.controlText} allowFontScaling={false}>마이크</Text>
        </Pressable>
        <Pressable style={[styles.controlButton, !cameraOn && styles.controlOff]} onPress={handleToggleCamera}>
          <Ionicons name={cameraOn ? 'videocam' : 'videocam-off'} size={22} color={MANGA.ink} />
          <Text style={styles.controlText} allowFontScaling={false}>카메라</Text>
        </Pressable>
        <Pressable onPress={leave} disabled={ending} style={[styles.endButton, ending && styles.disabled]}>
          {ending ? (
            <ActivityIndicator color={MANGA.paper} />
          ) : (
            <>
              <Ionicons name="call" size={22} color={MANGA.paper} />
              <Text style={styles.endText} allowFontScaling={false}>종료</Text>
            </>
          )}
        </Pressable>
      </View>
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
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { color: MANGA.ink, fontSize: 18, fontFamily: FONT_FAMILY.primaryBold },
  headerSub: { color: MANGA.ink, opacity: 0.55, fontSize: 11, fontFamily: FONT_FAMILY.primaryBold, marginTop: 2 },
  stage: { flex: 1, padding: SPACING.md, flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  videoTile: {
    width: '48%',
    minHeight: 210,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.cardLg,
    backgroundColor: MANGA.ink,
    overflow: 'hidden',
    position: 'relative',
  },
  localTile: { backgroundColor: MANGA.paper },
  video: { width: '100%', height: '100%' },
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
  loadingOverlay: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    top: SPACING.lg,
    borderWidth: 2,
    borderColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.card,
    backgroundColor: MANGA.y,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  loadingText: { color: MANGA.ink, fontSize: 12, fontFamily: FONT_FAMILY.primaryBold },
  notice: {
    marginHorizontal: SPACING.lg,
    borderWidth: 2,
    borderColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.cardLg,
    backgroundColor: MANGA.y,
    padding: SPACING.md,
  },
  noticeTitle: { color: MANGA.ink, fontSize: 15, fontFamily: FONT_FAMILY.primaryBold },
  noticeText: { color: MANGA.ink, opacity: 0.72, fontSize: 12, fontFamily: FONT_FAMILY.primary, lineHeight: 18, marginTop: 4 },
  controls: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  controlButton: {
    flex: 1,
    height: 54,
    borderWidth: 2,
    borderColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.card,
    backgroundColor: MANGA.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlOff: { backgroundColor: MANGA.paper2, opacity: 0.74 },
  controlText: { color: MANGA.ink, fontSize: 11, fontFamily: FONT_FAMILY.primaryBold, marginTop: 2 },
  endButton: {
    flex: 1,
    height: 54,
    borderWidth: 2,
    borderColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.card,
    backgroundColor: MANGA.r,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.55 },
  endText: { color: MANGA.paper, fontSize: 11, fontFamily: FONT_FAMILY.primaryBold, marginTop: 2 },
});
