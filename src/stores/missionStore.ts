import { create } from 'zustand';
import type { Mission, MissionObjective } from '../types';

interface MissionState {
  activeMission: Mission | null;
  objectiveProgress: MissionObjective[];
  timerRemaining: number | null; // seconds

  // Actions
  setActiveMission: (mission: Mission | null) => void;
  updateObjective: (objectiveId: string, currentValue: number) => void;
  setTimer: (seconds: number | null) => void;
  decrementTimer: () => void;
  clearMission: () => void;
}

export const useMissionStore = create<MissionState>((set) => ({
  activeMission: null,
  objectiveProgress: [],
  timerRemaining: null,

  setActiveMission: (mission) =>
    set({
      activeMission: mission,
      objectiveProgress: mission?.objectives ?? [],
      timerRemaining: mission?.timeLimit ?? null,
    }),
  updateObjective: (objectiveId, currentValue) =>
    set((state) => ({
      objectiveProgress: state.objectiveProgress.map((obj) =>
        obj.id === objectiveId
          ? { ...obj, currentValue, isCompleted: currentValue >= obj.targetValue }
          : obj
      ),
    })),
  setTimer: (seconds) => set({ timerRemaining: seconds }),
  decrementTimer: () =>
    set((state) => ({
      timerRemaining: state.timerRemaining !== null ? Math.max(0, state.timerRemaining - 1) : null,
    })),
  clearMission: () =>
    set({ activeMission: null, objectiveProgress: [], timerRemaining: null }),
}));
