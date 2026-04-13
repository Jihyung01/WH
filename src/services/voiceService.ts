import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

type VoiceContext = 'checkin' | 'levelup' | 'evolution' | 'startup';

const BASE_TEXT: Record<VoiceContext, string> = {
  checkin: '도착했어! 탐험 시작하자!',
  levelup: '축하해! 레벨 업!',
  evolution: '와! 변했어! 새로운 모습이야!',
  startup: '좋은 탐험 되길 바라!',
};

function startupLineByTime(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '새벽 탐험도 멋져! 안전하게 다녀와.';
  if (hour < 12) return '좋은 아침! 오늘도 한 걸음씩 탐험해보자.';
  if (hour < 18) return '오후 탐험 출발! 새로운 장소를 발견해보자.';
  if (hour < 22) return '저녁 바람 좋다! 오늘의 탐험을 완성해보자.';
  return '밤 탐험은 조심해서! 천천히 즐겨보자.';
}

function voiceForCharacter(characterType?: string) {
  // expo-speech는 플랫폼 기본 TTS 엔진 사용. 언어/속도/피치만 커스텀.
  switch (characterType) {
    case 'haram':
      return { language: 'ko-KR', rate: 0.9, pitch: 0.95 };
    case 'narae':
      return { language: 'ko-KR', rate: 1.05, pitch: 1.05 };
    case 'byeolzzi':
      return { language: 'ko-KR', rate: 1.1, pitch: 1.25 };
    case 'dodam':
    default:
      return { language: 'ko-KR', rate: 0.95, pitch: 1.0 };
  }
}

export function stopCharacterVoice() {
  Speech.stop();
}

export function speakCharacterLine(
  context: VoiceContext,
  characterType?: string,
  overrideText?: string,
) {
  try {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    const cfg = voiceForCharacter(characterType);
    const text =
      overrideText ??
      (context === 'startup' ? startupLineByTime() : BASE_TEXT[context]);

    Speech.speak(text, {
      language: cfg.language,
      rate: cfg.rate,
      pitch: cfg.pitch,
    });
  } catch {
    // no-op
  }
}

