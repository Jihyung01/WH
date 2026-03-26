import { useCallback } from 'react';
import { useMissionStore } from '../stores/missionStore';
import { missionService } from '../services/missionService';

export function useMissions() {
  const { activeMission, objectiveProgress, timerRemaining, setActiveMission, updateObjective, clearMission } = useMissionStore();

  const startMission = useCallback(async (missionId: string) => {
    const mission = await missionService.start(missionId);
    setActiveMission(mission);
    return mission;
  }, []);

  const submitProgress = useCallback(async (objectiveId: string, value: number) => {
    if (!activeMission) return;
    updateObjective(objectiveId, value);
    await missionService.updateProgress(activeMission.id, objectiveId, value);
  }, [activeMission]);

  const completeMission = useCallback(async () => {
    if (!activeMission) return null;
    const result = await missionService.complete(activeMission.id);
    clearMission();
    return result;
  }, [activeMission]);

  const isAllObjectivesComplete = objectiveProgress.every((o) => o.isCompleted);

  return {
    activeMission,
    objectiveProgress,
    timerRemaining,
    isAllObjectivesComplete,
    startMission,
    submitProgress,
    completeMission,
  };
}
