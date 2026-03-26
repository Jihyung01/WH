import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import { eventService } from '../services/eventService';
import { EventCategory } from '../types/enums';

const CACHE_PREFIX = 'narrative_';
const TYPEWRITER_INTERVAL_MS = 30;

type NarrativeStatus = 'idle' | 'loading' | 'typing' | 'done' | 'error' | 'offline';

interface UseNarrativeResult {
  displayedText: string;
  fullText: string;
  status: NarrativeStatus;
  retry: () => void;
}

const FALLBACK_NARRATIVES: Partial<Record<EventCategory, string>> = {
  [EventCategory.ACTIVITY]: '이 골목에는 오래된 비밀이 숨겨져 있습니다. 지도에 표시되지 않는 이 길을 따라가면, 도시의 숨겨진 이야기를 만날 수 있을 거예요...',
  [EventCategory.FOOD]: '"진짜 맛집은 사람들이 줄을 서지 않는 곳에 있다." 이 거리의 오래된 주민이 전해준 말입니다. 골목 안쪽, 작은 간판 하나가 당신을 기다리고 있어요...',
  [EventCategory.CULTURE]: '1970년대, 이 거리를 걸었던 예술가들의 흔적을 찾아보세요. 벽에 남겨진 그림 하나하나에 시대의 이야기가 담겨 있습니다...',
  [EventCategory.CAFE]: '커피 한 잔의 여유 속에서 이 동네의 감성을 느껴보세요. 창가 자리에 앉으면 지나가는 사람들의 이야기가 들리는 듯합니다...',
  [EventCategory.NATURE]: '도심 한가운데, 자연이 숨 쉬는 곳이 있습니다. 잠시 걸음을 멈추고 나뭇잎 사이로 비치는 햇살을 느껴보세요...',
  [EventCategory.NIGHTLIFE]: '해가 지면 이 거리는 전혀 다른 모습으로 변합니다. 네온사인 불빛 아래, 밤의 모험이 시작됩니다...',
  [EventCategory.SHOPPING]: '이 거리에는 보물이 숨겨져 있습니다. 하나하나 가게를 둘러보며 당신만의 특별한 발견을 해보세요...',
  [EventCategory.HIDDEN_GEM]: '대부분의 사람들은 이곳을 그냥 지나칩니다. 하지만 멈춰서 자세히 보면, 이 도시가 감추고 있던 비밀이 서서히 드러납니다...',
};

async function getCached(eventId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`${CACHE_PREFIX}${eventId}`);
  } catch {
    return null;
  }
}

async function setCache(eventId: string, narrative: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CACHE_PREFIX}${eventId}`, narrative);
  } catch {
    // silent
  }
}

export function useNarrative(
  eventId: string | undefined,
  category: EventCategory = EventCategory.ACTIVITY,
  existingNarrative?: string | null,
): UseNarrativeResult {
  const [fullText, setFullText] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [status, setStatus] = useState<NarrativeStatus>('idle');
  const charIndex = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchId = useRef(0);

  const startTypewriter = useCallback((text: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    charIndex.current = 0;
    setDisplayedText('');
    setStatus('typing');

    timerRef.current = setInterval(() => {
      charIndex.current += 1;
      if (charIndex.current >= text.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setDisplayedText(text);
        setStatus('done');
      } else {
        setDisplayedText(text.slice(0, charIndex.current));
      }
    }, TYPEWRITER_INTERVAL_MS);
  }, []);

  const fetchNarrative = useCallback(async () => {
    if (!eventId) return;

    const thisId = ++fetchId.current;
    setStatus('loading');

    // 1. If event already has a narrative, use it
    if (existingNarrative) {
      setFullText(existingNarrative);
      startTypewriter(existingNarrative);
      return;
    }

    // 2. Check local cache
    const cached = await getCached(eventId);
    if (cached) {
      if (thisId !== fetchId.current) return;
      setFullText(cached);
      startTypewriter(cached);
      return;
    }

    // 3. Check connectivity
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      if (thisId !== fetchId.current) return;
      setStatus('offline');
      return;
    }

    // 4. Try API (POST → FastAPI → Claude)
    try {
      const narrative = await eventService.generateNarrative(eventId);
      if (thisId !== fetchId.current) return;
      setFullText(narrative);
      await setCache(eventId, narrative);
      startTypewriter(narrative);
    } catch {
      // 5. Try GET (pre-generated narrative)
      try {
        const narrative = await eventService.getNarrative(eventId);
        if (thisId !== fetchId.current) return;
        setFullText(narrative);
        await setCache(eventId, narrative);
        startTypewriter(narrative);
      } catch {
        // 6. Fall back to category-specific local narrative
        if (thisId !== fetchId.current) return;
        const fallback = FALLBACK_NARRATIVES[category] ?? FALLBACK_NARRATIVES[EventCategory.ACTIVITY]!;
        setFullText(fallback);
        startTypewriter(fallback);
      }
    }
  }, [eventId, category, existingNarrative, startTypewriter]);

  const retry = useCallback(() => {
    fetchNarrative();
  }, [fetchNarrative]);

  useEffect(() => {
    fetchNarrative();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [eventId]);

  return { displayedText, fullText, status, retry };
}
