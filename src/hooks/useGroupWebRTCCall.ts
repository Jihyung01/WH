import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';

import { endGroupCall, startGroupCall } from '../lib/api';
import { supabase } from '../config/supabase';
import { useAuthStore } from '../stores/authStore';
import { readSignal, type CallPresence, type CallSignal, type SessionDescriptionSignal } from '../utils/webrtcSignal';

export interface PeerState {
  id: string;
  stream: MediaStream | null;
  connected: boolean;
}

type PeerConnectionWithEvents = RTCPeerConnection & {
  addEventListener(event: 'icecandidate', listener: (event: Event & { candidate?: RTCIceCandidate | null }) => void): void;
  addEventListener(event: 'track', listener: (event: Event & { streams?: MediaStream[] }) => void): void;
  addEventListener(event: 'connectionstatechange', listener: () => void): void;
};

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export function useGroupWebRTCCall(roomId: string): {
  localStream: MediaStream | null;
  peers: PeerState[];
  micOn: boolean;
  cameraOn: boolean;
  ready: boolean;
  callError: string | null;
  participantCount: number;
  toggleMic: () => void;
  toggleCamera: () => void;
  switchCamera: () => void;
  endCall: () => Promise<void>;
} {
  const me = useAuthStore((s) => s.user?.id ?? null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerState[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [ready, setReady] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const knownPeerIdsRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const participantCount = useMemo(() => peers.length + (localStream ? 1 : 0), [localStream, peers.length]);

  const sendSignal = useCallback(async (signal: CallSignal): Promise<void> => {
    const channel = channelRef.current;
    if (!channel) return;
    await channel.send({ type: 'broadcast', event: 'webrtc', payload: signal }).catch(() => 'error');
  }, []);

  const closePeer = useCallback((peerId: string): void => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(peerId);
    }
    knownPeerIdsRef.current.delete(peerId);
    setPeers((prev) => prev.filter((peer) => peer.id !== peerId));
  }, []);

  const createPeer = useCallback((peerId: string): RTCPeerConnection | null => {
    if (!me || !localStreamRef.current) return null;
    const existing = peersRef.current.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const pcEvents = pc as PeerConnectionWithEvents;
    peersRef.current.set(peerId, pc);
    knownPeerIdsRef.current.add(peerId);
    setPeers((prev) => (
      prev.some((peer) => peer.id === peerId)
        ? prev
        : [...prev, { id: peerId, stream: null, connected: false }]
    ));

    localStreamRef.current.getTracks().forEach((track) => {
      const stream = localStreamRef.current;
      if (stream) pc.addTrack(track, stream);
    });

    pcEvents.addEventListener('icecandidate', (event) => {
      const candidate = event.candidate?.toJSON();
      if (!candidate) return;
      void sendSignal({ kind: 'candidate', from: me, to: peerId, candidate });
    });

    pcEvents.addEventListener('track', (event) => {
      const remoteStream = event.streams?.[0] ?? null;
      if (!remoteStream) return;
      setPeers((prev) =>
        prev.map((peer) =>
          peer.id === peerId ? { ...peer, stream: remoteStream, connected: true } : peer,
        ),
      );
    });

    pcEvents.addEventListener('connectionstatechange', () => {
      const connected = pc.connectionState === 'connected' || pc.connectionState === 'connecting';
      setPeers((prev) =>
        prev.map((peer) => (peer.id === peerId ? { ...peer, connected } : peer)),
      );
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') closePeer(peerId);
    });

    return pc;
  }, [closePeer, me, sendSignal]);

  const makeOffer = useCallback(async (peerId: string): Promise<void> => {
    if (!me) return;
    const pc = createPeer(peerId);
    if (!pc) return;
    const offer = (await pc.createOffer()) as SessionDescriptionSignal;
    await pc.setLocalDescription(new RTCSessionDescription(offer));
    await sendSignal({ kind: 'offer', from: me, to: peerId, description: offer });
  }, [createPeer, me, sendSignal]);

  const handleSignal = useCallback(async (signal: CallSignal): Promise<void> => {
    if (!me || signal.from === me) return;
    if (signal.to && signal.to !== me) return;
    if (signal.kind === 'bye') {
      closePeer(signal.from);
      return;
    }
    if (signal.kind === 'hello') {
      if (me < signal.from) await makeOffer(signal.from);
      return;
    }

    const pc = createPeer(signal.from);
    if (!pc) return;
    if (signal.kind === 'offer' && signal.description) {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.description));
      const answer = (await pc.createAnswer()) as SessionDescriptionSignal;
      await pc.setLocalDescription(new RTCSessionDescription(answer));
      await sendSignal({ kind: 'answer', from: me, to: signal.from, description: answer });
      return;
    }
    if (signal.kind === 'answer' && signal.description) {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.description));
      return;
    }
    if (signal.kind === 'candidate' && signal.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  }, [closePeer, createPeer, makeOffer, me, sendSignal]);

  useEffect(() => {
    if (!roomId || !me) {
      setCallError('통화방 정보를 찾을 수 없어요.');
      return;
    }

    const userId = me;
    let cancelled = false;

    async function startCall(): Promise<void> {
      try {
        await startGroupCall(roomId);
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: 'user', width: 720, height: 1280, frameRate: 24 },
        });
        if (cancelled) {
          stream.release(true);
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);

        const channel = supabase.channel(`group-call:${roomId}`, {
          config: { broadcast: { self: false }, presence: { key: userId } },
        });
        channelRef.current = channel;

        channel.on<CallSignal>('broadcast', { event: 'webrtc' }, (payload) => {
          const signal = readSignal(payload.payload);
          if (signal) void handleSignal(signal).catch(() => {});
        });

        channel.on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<CallPresence>();
          const activeIds = new Set<string>(
            Object.values(state)
              .flat()
              .map((presence) => presence.user_id)
              .filter((id): id is string => typeof id === 'string' && id !== userId),
          );
          for (const peerId of activeIds) {
            if (!knownPeerIdsRef.current.has(peerId) && userId < peerId) void makeOffer(peerId).catch(() => {});
          }
          for (const peerId of Array.from(knownPeerIdsRef.current)) {
            if (!activeIds.has(peerId)) closePeer(peerId);
          }
        });

        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            void channel.track({ user_id: userId, joined_at: new Date().toISOString() });
            void sendSignal({ kind: 'hello', from: userId });
            setReady(true);
          }
        });
      } catch {
        setCallError('카메라와 마이크를 열지 못했어요. 권한을 확인해 주세요.');
      }
    }

    void startCall();
    return () => {
      cancelled = true;
      void sendSignal({ kind: 'bye', from: userId });
      const channel = channelRef.current;
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      knownPeerIdsRef.current.clear();
      localStreamRef.current?.release(true);
      localStreamRef.current = null;
    };
  }, [closePeer, handleSignal, makeOffer, me, roomId, sendSignal]);

  const toggleMic = useCallback(() => {
    const next = !micOn;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicOn(next);
  }, [micOn]);

  const toggleCamera = useCallback(() => {
    const next = !cameraOn;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCameraOn(next);
  }, [cameraOn]);

  const switchCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track._switchCamera();
    });
  }, []);

  const endCall = useCallback(async (): Promise<void> => {
    if (!roomId) return;
    await endGroupCall(roomId);
  }, [roomId]);

  return {
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
  };
}
