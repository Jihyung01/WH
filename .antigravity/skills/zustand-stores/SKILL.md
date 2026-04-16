---
name: zustand-stores
description: WhereHere의 Zustand 상태 관리 코드(authStore, characterStore, mapStore 등 15개) 수정 시 자동 로드. 과거에 실제로 Hermes segfault(앱 즉사)를 일으킨 setter 패턴과 persist middleware 설정을 반드시 따른다. AsyncStorage 어댑터 규약, 타입 가드, 낙관적 업데이트 패턴을 포함한다.
---

# Zustand Stores Skill

## 언제 쓰는가
- `src/stores/` 내 모든 파일 수정
- 새 전역 상태 추가 시
- persist middleware 설정 변경
- Store 간 의존성 조정

## 🚨 절대 하지 말 것 (실제로 크래시 유발)

### 1. Setter에 업데이트 함수 전달 금지
```typescript
// ❌ 절대 금지 — Hermes segfault 발생 (앱 즉사, 크래시 로그 없음)
setVisibleEvents(prev => [...prev, newEvent]);
setCoins(current => current + 10);

// ✅ 반드시 최종 값 전달
const newEvents = [...currentEvents, newEvent];
setVisibleEvents(newEvents);

// store 외부에서 현재값이 필요하면 get() 또는 getState() 사용
const currentCoins = useCharacterStore.getState().coins;
setCoins(currentCoins + 10);
```

### 2. MMKV 재도입 금지
```typescript
// ❌ 금지 — 지도 region 변경 시 SIGABRT 크래시
import { MMKV } from 'react-native-mmkv';

// ✅ AsyncStorage만 사용
import AsyncStorage from '@react-native-async-storage/async-storage';
```

### 3. setter 내부에서 타입 가드 누락 금지
```typescript
// ❌ 위험 — next가 예상 외 타입일 때 크래시
setVisibleEvents: (next) => set({ visibleEvents: next }),

// ✅ 타입 가드 필수
setVisibleEvents: (next) => set({ 
  visibleEvents: Array.isArray(next) ? next : [] 
}),
```

## 현재 Store 구조 (15개)

| Store | 주요 상태 | 특이사항 |
|---|---|---|
| `authStore.ts` | user, session, profile, explorer_type | 506줄. Kakao/Apple/Email 3-way 로그인 처리 |
| `characterStore.ts` | character, loadout, coins, personality | 370줄. 낙관적 업데이트 + 서버 확인 패턴 |
| `premiumStore.ts` | is_premium, entitlements | RevenueCat 연동 |
| `questStore.ts` | active_quests, completed | |
| `mapStore.ts` | visible_events, region, filter | 지도 탭 상태 |
| `locationStore.ts` | current_location, permissions | |
| `inventoryStore.ts` | items, cosmetics | |
| `missionStore.ts` | active_mission, progress | |
| `notificationStore.ts` | prefs, push_token | |
| `profileStore.ts` | stats, achievements | |
| `moderationStore.ts` | blocked_users, reports | |
| `weatherStore.ts` | weather, time_of_day | 이벤트 필터링에 사용 |
| `uiStore.ts` | theme_override, show_tutorials | 다크모드 토글 |
| `storage.ts` | — | persist storage 어댑터 |
| `supabaseAuthStorage.ts` | — | Supabase 세션 storage |

## 표준 Store 템플릿

```typescript
// src/stores/exampleStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { persistStorage } from './storage';

// 1. State 타입 정의
interface ExampleState {
  // 데이터
  items: Item[];
  selectedId: string | null;
  isLoading: boolean;
  
  // Actions (반환 없거나 async Promise<void>)
  setItems: (next: Item[]) => void;  // ✅ 최종 값만 받음
  setSelectedId: (id: string | null) => void;
  clearAll: () => void;
  loadItems: () => Promise<void>;
}

// 2. Store 생성
export const useExampleStore = create<ExampleState>()(
  persist(
    (set, get) => ({
      // 초기값
      items: [],
      selectedId: null,
      isLoading: false,
      
      // Actions
      setItems: (next) => set({ 
        // 타입 가드 필수
        items: Array.isArray(next) ? next : [] 
      }),
      
      setSelectedId: (id) => set({ selectedId: id }),
      
      clearAll: () => set({ 
        items: [], 
        selectedId: null, 
        isLoading: false 
      }),
      
      loadItems: async () => {
        set({ isLoading: true });
        try {
          const data = await api.fetchItems();
          // get()으로 현재 상태 참조 가능
          const currentSelected = get().selectedId;
          set({ 
            items: data, 
            isLoading: false 
          });
        } catch (error) {
          console.error('loadItems failed:', error);
          set({ isLoading: false });
          throw error;
        }
      },
    }),
    {
      // persist 설정
      name: 'example-store',
      storage: createJSONStorage(() => persistStorage),
      // 민감 정보 제외
      partialize: (state) => ({
        items: state.items,
        selectedId: state.selectedId,
        // isLoading은 persist하지 않음
      }),
      // 버전 관리
      version: 1,
      migrate: (persistedState: any, version) => {
        if (version === 0) {
          // 마이그레이션 로직
        }
        return persistedState;
      },
    }
  )
);
```

## Persist Storage 어댑터

```typescript
// src/stores/storage.ts (이미 존재, 수정 금지 원칙)
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

export const persistStorage: StateStorage = {
  getItem: async (name) => {
    try {
      return (await AsyncStorage.getItem(name)) ?? null;
    } catch (error) {
      console.error('persistStorage.getItem failed:', error);
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch (error) {
      console.error('persistStorage.setItem failed:', error);
    }
  },
  removeItem: async (name) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (error) {
      console.error('persistStorage.removeItem failed:', error);
    }
  },
};
```

## 낙관적 업데이트 패턴 (characterStore 사례)

```typescript
// 코스메틱 장착 — 낙관적 업데이트 + 서버 확인
equipCosmetic: async (cosmeticId: string) => {
  const currentLoadout = get().loadout;
  
  // 1. 낙관적 업데이트 (UI 즉시 반응)
  set({ loadout: { ...currentLoadout, [slot]: cosmeticId } });
  
  try {
    // 2. 서버 호출
    const serverLoadout = await api.equipCosmetic(cosmeticId);
    // 3. 서버 응답으로 최종 동기화
    set({ loadout: serverLoadout });
  } catch (error) {
    // 4. 실패 시 롤백
    set({ loadout: currentLoadout });
    throw error;
  }
},
```

## Store 간 의존성

### ✅ 허용 패턴
```typescript
// 다른 store의 상태 읽기
const userId = useAuthStore.getState().user?.id;

// 다른 store의 액션 호출
useCharacterStore.getState().refreshCharacter();
```

### ❌ 피해야 할 패턴
```typescript
// store 내부에서 다른 store를 subscribe 금지 (순환 의존 위험)
const useStoreA = create((set) => ({
  value: 0,
  init: () => {
    useStoreB.subscribe(...);  // ❌
  }
}));
```

## 로그아웃 시 전역 클리어

```typescript
// src/utils/clearUserLocalCaches.ts (이미 존재)
export async function clearUserLocalCaches() {
  useAuthStore.getState().clearAll();
  useCharacterStore.getState().clearAll();
  useMapStore.getState().clearAll();
  useInventoryStore.getState().clearAll();
  // ... 모든 user-scoped store의 clearAll() 호출
  
  // AsyncStorage 직접 클리어 (persist 키도)
  await AsyncStorage.multiRemove([
    'auth-store',
    'character-store',
    // ...
  ]);
}
```

**새 store 추가 시 반드시 `clearAll()` 구현 + `clearUserLocalCaches`에 등록**

## 타입 안전성

### store 타입을 export
```typescript
// 다른 파일에서 타입 재사용 가능
export type ExampleStoreState = ExampleState;
```

### Selector 패턴
```typescript
// 컴포넌트에서 필요한 값만 구독 (re-render 최적화)
const items = useExampleStore((state) => state.items);
const setItems = useExampleStore((state) => state.setItems);

// 여러 값 구독 시 shallow 비교
import { shallow } from 'zustand/shallow';
const { items, selectedId } = useExampleStore(
  (state) => ({ items: state.items, selectedId: state.selectedId }),
  shallow
);
```

## 디버깅

### Store 상태 로깅
```typescript
// 개발 중 임시 추가 (배포 전 제거)
if (__DEV__) {
  useExampleStore.subscribe((state) => {
    console.log('[ExampleStore]', state);
  });
}
```

### Redux DevTools (선택적)
```typescript
import { devtools } from 'zustand/middleware';

export const useExampleStore = create()(
  devtools(
    persist(
      (set, get) => ({ /* ... */ }),
      { name: 'example-store' }
    ),
    { name: 'ExampleStore' }
  )
);
```

## 체크리스트

Store 수정 완료 전:
- [ ] setter에 **값만** 전달 (업데이트 함수 X)
- [ ] 배열/객체 타입 가드 포함
- [ ] AsyncStorage 어댑터 사용 (MMKV 금지)
- [ ] persist 설정 시 `partialize`로 민감 정보 제외
- [ ] `clearAll()` 액션 구현 (로그아웃 시 호출용)
- [ ] 새 store면 `clearUserLocalCaches`에 등록
- [ ] 타입 명시 (no `any`)
- [ ] 비동기 액션은 try/catch + 에러 rethrow
- [ ] 낙관적 업데이트 시 롤백 경로 구현

## OTA 배포 가능 여부
- ✅ Store 로직 변경은 전부 OTA 가능 (JS 레이어)
- ⚠️ persist 스키마 변경 시 `version` bump + `migrate` 함수 필수 (기존 유저 데이터 손실 방지)
