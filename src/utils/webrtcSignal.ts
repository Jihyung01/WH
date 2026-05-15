import type { MediaStream } from 'react-native-webrtc';

export type SignalKind = 'hello' | 'offer' | 'answer' | 'candidate' | 'bye';

export interface SessionDescriptionSignal {
  type: string | null;
  sdp: string;
}

export interface IceCandidateSignal {
  candidate: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
}

export interface CallSignal {
  kind: SignalKind;
  from: string;
  to?: string;
  description?: SessionDescriptionSignal;
  candidate?: IceCandidateSignal;
}

export interface CallPresence {
  user_id: string;
  joined_at: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function readSignal(value: unknown): CallSignal | null {
  if (!isRecord(value)) return null;
  const kind = value.kind;
  const from = value.from;
  if (
    kind !== 'hello' &&
    kind !== 'offer' &&
    kind !== 'answer' &&
    kind !== 'candidate' &&
    kind !== 'bye'
  ) {
    return null;
  }
  if (typeof from !== 'string' || from.length === 0) return null;
  const to = typeof value.to === 'string' ? value.to : undefined;
  const description = isRecord(value.description) &&
    typeof value.description.sdp === 'string' &&
    (typeof value.description.type === 'string' || value.description.type === null)
    ? { sdp: value.description.sdp, type: value.description.type }
    : undefined;
  const candidate = isRecord(value.candidate) && typeof value.candidate.candidate === 'string'
    ? {
        candidate: value.candidate.candidate,
        sdpMLineIndex: typeof value.candidate.sdpMLineIndex === 'number' ? value.candidate.sdpMLineIndex : null,
        sdpMid: typeof value.candidate.sdpMid === 'string' ? value.candidate.sdpMid : null,
      }
    : undefined;
  return { kind, from, to, description, candidate };
}

export function streamUrl(stream: MediaStream | null): string | null {
  return stream ? stream.toURL() : null;
}
