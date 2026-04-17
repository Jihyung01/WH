import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { Mark, CreateMarkParams, CreateMarkResult } from '../types/models';
import {
  getNearbyMarks,
  getMyMarks,
  getTodayMarkCount,
  createMark as apiCreateMark,
  uploadMarkPhoto,
} from '../lib/api';
import { zustandStorage } from './storage';
import { captureError } from '../utils/errorReporting';

interface MarkState {
  nearbyMarks: Mark[];
  myTodayMarks: Mark[];
  isCreating: boolean;
  isLoadingNearby: boolean;
  todayCount: number;
  lastFetchedAt: number | null;

  setNearbyMarks: (marks: Mark[]) => void;
  setMyTodayMarks: (marks: Mark[]) => void;

  loadNearbyMarks: (lat: number, lng: number, radiusKm?: number) => Promise<void>;
  loadMyTodayMarks: () => Promise<void>;
  refreshTodayCount: () => Promise<void>;
  /**
   * Creates a mark. `params` may omit `photo_url`; the store uploads `photoUri`
   * first and injects the resulting public URL into the RPC call.
   */
  createMark: (
    params: Omit<CreateMarkParams, 'photo_url'>,
    photoUri: string,
  ) => Promise<CreateMarkResult>;

  addOptimisticMark: (mark: Mark) => void;

  clearAll: () => void;
}

function asArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function mergeMarks(prev: Mark[], next: Mark[]): Mark[] {
  const byId = new Map<string, Mark>();
  for (const m of prev) byId.set(m.id, m);
  for (const m of next) byId.set(m.id, m);
  return Array.from(byId.values()).sort((a, b) => {
    const ta = Date.parse(a.created_at) || 0;
    const tb = Date.parse(b.created_at) || 0;
    return tb - ta;
  });
}

export const useMarkStore = create<MarkState>()(
  persist(
    (set, get) => ({
      nearbyMarks: [],
      myTodayMarks: [],
      isCreating: false,
      isLoadingNearby: false,
      todayCount: 0,
      lastFetchedAt: null,

      setNearbyMarks: (marks) => {
        set({ nearbyMarks: asArray<Mark>(marks) });
      },
      setMyTodayMarks: (marks) => {
        const list = asArray<Mark>(marks);
        set({ myTodayMarks: list, todayCount: list.length });
      },

      loadNearbyMarks: async (lat, lng, radiusKm = 2) => {
        if (get().isLoadingNearby) return;
        set({ isLoadingNearby: true });
        try {
          const marks = await getNearbyMarks(lat, lng, radiusKm);
          set({
            nearbyMarks: asArray<Mark>(marks),
            lastFetchedAt: Date.now(),
          });
        } catch (err) {
          captureError(err, { tag: 'markStore.loadNearbyMarks' });
        } finally {
          set({ isLoadingNearby: false });
        }
      },

      loadMyTodayMarks: async () => {
        try {
          const marks = await getMyMarks();
          const list = asArray<Mark>(marks);
          set({ myTodayMarks: list, todayCount: list.length });
        } catch (err) {
          captureError(err, { tag: 'markStore.loadMyTodayMarks' });
        }
      },

      refreshTodayCount: async () => {
        try {
          const count = await getTodayMarkCount();
          set({ todayCount: count });
        } catch (err) {
          captureError(err, { tag: 'markStore.refreshTodayCount' });
        }
      },

      createMark: async (params, photoUri) => {
        if (get().isCreating) {
          throw new Error('이미 흔적을 남기는 중입니다.');
        }
        set({ isCreating: true });
        try {
          const photoUrl = await uploadMarkPhoto(photoUri);
          const result = await apiCreateMark({ ...params, photo_url: photoUrl });

          const curNearby = asArray<Mark>(get().nearbyMarks);
          const curToday = asArray<Mark>(get().myTodayMarks);
          set({
            nearbyMarks: mergeMarks(curNearby, [result.mark]),
            myTodayMarks: mergeMarks(curToday, [result.mark]),
            todayCount: result.today_mark_count,
          });

          // NOTE: `result.should_generate_journal`이 true일 때의 자동 생성 트리거는
          // 호출 측(CreateMarkSheet 등)이 토스트/알림 + 네비게이션으로 처리한다.
          // 스토어가 직접 네트워크/네비게이션을 일으키지 않아, 캐릭터 화면 등
          // 비-UX 컨텍스트에서 불필요한 Edge Function 호출을 방지한다.
          return result;
        } finally {
          set({ isCreating: false });
        }
      },

      addOptimisticMark: (mark) => {
        const curNearby = asArray<Mark>(get().nearbyMarks);
        const curToday = asArray<Mark>(get().myTodayMarks);
        set({
          nearbyMarks: mergeMarks(curNearby, [mark]),
          myTodayMarks: mergeMarks(curToday, [mark]),
        });
      },

      clearAll: () => {
        set({
          nearbyMarks: [],
          myTodayMarks: [],
          isCreating: false,
          isLoadingNearby: false,
          todayCount: 0,
          lastFetchedAt: null,
        });
      },
    }),
    {
      name: 'mark-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        nearbyMarks: state.nearbyMarks,
        todayCount: state.todayCount,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<MarkState>;
        return {
          ...current,
          ...p,
          nearbyMarks: asArray<Mark>(p.nearbyMarks, current.nearbyMarks),
          todayCount:
            typeof p.todayCount === 'number' ? p.todayCount : current.todayCount,
        };
      },
    },
  ),
);
