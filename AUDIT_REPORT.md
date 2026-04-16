# 감사 보고서: WhereHere 핵심 기능 (12항목)

> 작성일: 2026-04-16
> 감사자: Antigravity Agent (Gemini 3.1 Pro)
> 범위: 탐험 일지, 건강 보상, AI 등 지정된 12개 횡단 주요 로직

## 요약

| 상태 | 개수 |
|---|---|
| ✅ 구현됨 | 3 |
| ⚠️ 부분 구현 | 4 |
| ❌ 미구현 | 5 |
| 🐛 버그 있음 | 0 |

## 상세 조사 결과

| # | 기능 | 상태 | 증거 (파일:라인) | 문제/원인 | 추천 조치 |
|---|---|---|---|---|---|
| 1 | 탐험 일지 만들기 | ✅ 구현됨 | `app/journal.tsx:425`, `169` | `handleGenerate()` 함수가 `generateJournal` 호출 및 로딩 연동. 문제 없음. | 현 상태 유지 (Edge Function 가동 모니터링) |
| 2 | 탐험 일지 목록 조회 | ⚠️ 부분 구현 | `app/journal.tsx:144` | API(`getJournals`)는 연결되었으나 현재 목록이 비어 있으면 "기록 없음"만 렌더링. 빈 화면에 대한 플레이스홀더라 실제 버그는 아니나 백엔드 데이터 확인 필요. | 클라이언트 측 더미 데이터 렌더링 검증, 또는 백엔드 발급 흐름 테스트 |
| 3 | 걸음수 마일스톤 보상 | ✅ 구현됨 | `app/(tabs)/profile.tsx:478` | `[1000, 3000, 5000, 10000]` 배열 순회하며 `claimDailyStepReward(m)` 호출 로직 존재. | 현 상태 유지 |
| 4 | 주간 걸음수 그래프 | ❌ 미구현 | 증거 없음 | `profile.tsx` 내부 어느 라인에도 그래프 시각화(`LineChart`, `BarChart`) 컴포넌트가 존재하지 않음. | 차트 라이브러리 추가 후, 걸음 수(`HealthKit`) 히스토리 연동 뷰 작성 |
| 5 | 다크모드 전체 반영 | ❌ 미구현 | 증거 없음 | `uiStore.ts`, `ThemeProvider.tsx` 등에서 시스템 세팅을 명시적으로 Override 하는 스위치/토글 상태가 전무. | `uiStore` 내부에 `colorScheme` 설정 추가하고 수동 토글 UI 삽입 |
| 6 | 리더보드 (해당 탭/화면) | ⚠️ 부분 구현 | `src/stores/profileStore.ts:45` | `fetchLeaderboard(district)`로 파라미터를 넘길 수 있게 백엔드는 연동되어 있으나, UI에서 셀렉터나 필터 버튼이 없음. | 리더보드 상위에 '지역 필터 모달/드롭다운' 추가 |
| 7 | 나의 탐험 지도 UI 검은화면 | ⚠️ 부분 구현 | `app/(tabs)/profile.tsx:677` | 맵 컴포넌트 없이 수동 마커(`loc.lng - 126.93 / 0.1` 하드코딩) 비율 계산으로 점을 뿌림. 해당 좌푯값 밖이면 검게/잘못 렌더될 수 있음 | 실제 `react-native-maps`를 포함해 Bounding Box 동적 렌더링으로 정석대로 이식 |
| 8 | 100m 이내 유저 공유 알림 | ❌ 미구현 | `src/services/backgroundLocation.ts:115` | 스토어나 이벤트 객체(200M 반경)에 닿을 시 트리거되는 로직만 존재하고, '유저와 유저'간의 100m 탐색 푸시는 없음. | PostGIS 유저 실시간 크로스 분석 기반 Edge Function 구현 필요 |
| 9 | 일일 탐험 AI 요약 | ✅ 구현됨 | `supabase/functions/generate-journal` | 하위 `index.ts` 코드 및 폴더 내역 일치. | 현 상태 유지 |
| 10 | AI 개인화 추천 | ❌ 미구현 | 증거 없음 (`api.ts` 미기재) | 백엔드 Edge Function은 존재하지만, 현 프로젝트 클라이언트 코드 내에서 `recommend-events`를 호출하는 브릿지가 일절 없음. | Explore 탭 진입 시점에 추천 이벤트 가져오는 Fetch API 연계 |
| 11 | 진화 이미지 생성 | ❌ 미구현 | 증거 없음 (`api.ts` 미기재) | 프론트 앱 어디에서도 `generate-evolution-image` Edge Function을 쏘는(trigger) 지점이 없음. | 오버레이(`EvolutionCelebrationOverlay`) 등에서 모달 진입 시 함수 Call 추가 |
| 12 | TTS 보이스 제어 기능 | ⚠️ 부분 구현 | `app/(tabs)/profile.tsx:211`, `src/services/voiceService.ts:41` | 코드는 동작하여 초기 프로필 탭 접근 시 소리출력이 되나, 끄고 켤 수 있는(settings 등) 상태값(On/Off) 저장이 되지 않음. | 설정 메뉴에 "음성 출력 On/Off 토글" 스토어 변수 추가 필수 및 Service 방어 |

---

> 이 감사는 읽기 전용 모드로 수행되었으며 현상 분석에 집중했습니다.
