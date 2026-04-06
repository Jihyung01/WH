import { useState, useCallback } from 'react';
import { generateNarrative } from '../lib/api';
import { useCharacterStore } from '../stores/characterStore';
import type { ShareJournalData } from '../components/share/ShareJournalCard';
import type { CompleteEventResult } from '../types';

/**
 * Prepares share card data after event completion.
 * Generates an AI narrative if one isn't cached, then assembles
 * all the stats into a ShareJournalData object for the card.
 */
export function useShareJournal() {
  const [shareData, setShareData] = useState<ShareJournalData | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { character } = useCharacterStore();

  const prepare = useCallback(
    async (
      eventId: string,
      eventTitle: string,
      rewardResult: CompleteEventResult,
    ) => {
      try {
        let journalText = `${eventTitle}에서의 탐험을 완료했습니다! 새로운 경험치와 보상을 획득하며 한 걸음 더 성장했습니다.`;

        try {
          const narrative = await generateNarrative(eventId);
          if (narrative.narrative) {
            journalText = narrative.narrative;
          }
        } catch {
          // Fallback to default text
        }

        const today = new Date();
        const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

        const data: ShareJournalData = {
          date: dateStr,
          characterName: character?.name ?? '탐험가',
          characterType: character?.character_type ?? 'explorer',
          characterLevel: rewardResult.character?.new_level ?? character?.level ?? 1,
          journalText,
          placesVisited: [eventTitle],
          xpEarned: rewardResult.rewards.xp_earned,
          badgesEarned: rewardResult.rewards.badges_earned,
          totalXp: character?.xp,
        };

        setShareData(data);
        setIsReady(true);
      } catch (err) {
        console.warn('Failed to prepare share data:', err);
      }
    },
    [character],
  );

  const clear = useCallback(() => {
    setShareData(null);
    setIsReady(false);
  }, []);

  return { shareData, isReady, prepare, clear };
}
