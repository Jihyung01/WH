# WhereHere — AI 코딩 하네스 프롬프트
# 이 파일을 프로젝트 루트에 .cursorrules 또는 HARNESS.md로 저장
# Cursor: .cursorrules로 저장하면 자동 적용
# Antigravity: 세션 시작 시 "이 파일을 읽고 시작해" 로 전달
# Claude Code: CLAUDE.md로 저장하면 자동 적용

---

## 프로젝트 정체성

WhereHere는 위치 기반 탐험 + 캐릭터 성장 모바일 앱이다.
포켓몬GO의 탐험 구조를 한국 도시 생활권에 맞게 재해석하고,
AI 서사 + 순우리말 캐릭터 + 게이미피케이션을 결합한 서비스다.

핵심 루프: 지도에서 이벤트 발견 → 실제 장소로 이동 → GPS 체크인(100m)
→ 미션 수행(사진/퀴즈/텍스트) → 보상 획득 → 캐릭터 성장 → 반복

서비스 철학:
"이 앱은 단순 스탬프 앱이 아니다.
유저의 실제 이동, 체크인, 지역 편향, 시간대, 날씨 기반 행동을
캐릭터 정체성, 칭호, 성격 특성, 수집 욕구로 전환하는 것이 핵심이다.
모든 설계는 '현실 행동이 캐릭터 서사로 축적되는 경험'을 우선한다."

---

## 세션 시작 (프롬프트로 작업할 때)

- 작업 지시만 넘어오면 **본 하네스를 우선**한다 (`.cursorrules` = Cursor 자동, `CLAUDE.md` = Claude Code, `WhereHere_HARNESS.md`는 동일 내용 복사본).
- 구조 파악 시 자주 보는 경로: `app/`, `src/lib/api.ts`, `src/stores/`, `src/components/`, `supabase/functions/`, `supabase/migrations/`.
- 하네스와 요청이 충돌하면 **OTA·스토어 제약·금지 사항**을 먼저 지키고, 나머지는 사용자와 짧게 확인한다.

---

## 기술 스택

- 프론트: Expo SDK 54, React Native 0.81.5, TypeScript, Expo Router v6
- 상태: Zustand v5 (`src/stores/*.ts` — 14개 스토어 파일)
- 지도: react-native-maps + react-native-map-clustering
- 애니메이션: react-native-reanimated v4 (+ react-native-worklets)
- 바텀시트: @gorhom/bottom-sheet v5
- UI: expo-image, expo-linear-gradient, react-native-svg
- 미디어: expo-av (Apple Music 미리듣기 등)
- 카메라: expo-camera, expo-image-picker
- 위치: expo-location, expo-task-manager (백그라운드)
- 푸시: expo-notifications
- 인증: Supabase Auth (카카오 OAuth PKCE + Apple Sign In — `expo-apple-authentication`)
- DB: Supabase PostgreSQL + PostGIS
- 스토리지: Supabase Storage (mission-photos, avatars 버킷)
- 서버리스: Supabase Edge Functions **11개** (Deno)
- 외부 API: Apple Music 카탈로그 — **Edge `apple-music-search`** + MusicKit 키(Secrets); 앱 번들 `com.wherehere.app`
- AI: Anthropic Claude API (claude-sonnet-4-20250514) — Edge Function에서 호출
- 결제: react-native-purchases (RevenueCat; 초기화 코드 존재, 실제 상품 미설정)
- 분석: Mixpanel, Sentry (`@sentry/react-native`)
- 빌드: EAS Build/Update (`eas.json` production **channel**: `production`)
- OTA: expo-updates (checkAutomatically: ON_LOAD, `app.json` runtimeVersion 정책: appVersion → 현재 **1.1.0**)

별도 API 서버 없음. FastAPI 없음. Railway 없음.
모든 백엔드 로직은 Supabase 직접 호출 + RPC 함수 + Edge Functions로 처리.

---

## 배포 상태 (매우 중요 — 모든 작업 판단의 기준)

| 플랫폼 | 상태 | 제약 |
|--------|------|------|
| App Store (iOS) | ✅ 배포 완료 (v1.1.0) | 네이티브 변경 시 재빌드+재심사 필요 (1~3일) |
| Google Play | 🔶 내부 테스트 (테스터 3명) | 12명 확보 후 14일 대기 → 프로덕션 신청 |
| OTA (EAS Update) | ✅ 활성 | JS 코드 변경은 OTA로 즉시 배포 가능 |
| Runtime Version | 1.1.0 | 네이티브 변경 없으면 이 버전으로 OTA 계속 가능 |

### OTA vs Production 빌드 판단 기준

**OTA로 가능한 것 (JS/TS 코드만 변경):**
- UI 수정, 화면 추가, 컴포넌트 변경
- API 호출 로직 변경, 스토어 로직 변경
- 새 화면 라우트 추가 (app/ 하위)
- 스타일/테마/색상 변경
- 버그 수정 (JS 레벨)
- Edge Function 추가/수정 (supabase functions deploy)
- DB 마이그레이션 추가 (supabase db push)
- 새 RPC 함수 추가
- 이미지/아이콘 에셋 변경 (JS 번들 내)
- react-native-reanimated 애니메이션 추가
- Zustand 스토어 확장
- 새 hooks/services/utils 추가

**Production 빌드가 필요한 것 (네이티브 변경):**
- 새 네이티브 패키지 설치 (expo install로 네이티브 모듈 추가)
- app.json 변경 (권한, 스킴, 번들 ID, 버전 등)
- iOS Info.plist 변경
- Android AndroidManifest 변경
- EAS Build 설정 변경
- 네이티브 플러그인 설정 변경
- expo-camera, expo-location 등 네이티브 모듈 버전 업그레이드

### 절대 규칙
1. 새 네이티브 패키지를 설치하지 마라. 기존 설치된 것만 사용하라.
2. app.json을 수정하지 마라.
3. 모든 변경은 OTA 배포 가능한 범위 안에서 하라.
4. Production 빌드가 반드시 필요한 변경은 사전에 명시하고 확인을 받아라.
5. "이 변경은 OTA로 배포 가능합니다" 또는 "이 변경은 프로덕션 빌드가 필요합니다"를
   작업 완료 시 반드시 명시하라.

---

## DB 현황 (Supabase)

### 마이그레이션
- 저장소 기준 `supabase/migrations/`에 **23개** SQL 파일(타임스탬프 순). 원격과 차이는 `supabase db diff` / 대시보드로 확인.

### 주요 테이블
profiles, characters, events, missions, checkins, mission_completions,
event_completions, badges, user_badges, inventory_items,
character_cosmetics, user_cosmetics, character_loadout,
character_titles, user_titles, daily_exploration_journals,
character_chats, community_submissions, community_likes,
community_comments, friend_locations  
(친구·크루·차단 등 추가 테이블은 후속 마이그레이션 참고.)

### 커뮤니티 피드 · Apple Music
- `community_submissions.music_json` — 피드 글에 붙는 Apple Music 메타(JSON).
- RPC: `get_community_feed`, `create_community_submission_mission_photo`, `update_community_submission_music`, 좋아요/댓글(`toggle_feed_like`, `add_feed_comment`, `get_feed_comments`), `block_user` 등 — 정의는 `supabase/migrations/`에서 검색.
- **클라이언트**: `src/components/music/AppleMusicAttachSheet.tsx`, `FeedAppleMusicCard.tsx`; `src/lib/api.ts` — `searchAppleMusicTracks`, `updateCommunitySubmissionMusic`.
- **UX**: 포토 미션 완료 후 `app/event/[id].tsx`에서 피드 생성 뒤 시트; UGC는 **커버 이미지가 있을 때만** `generate-ugc-event`가 `feed_submission_id` 반환 → `app/create-event.tsx`에서 시트.
- Secrets 예시: `supabase/secrets.apple-music.example.txt`

### RPC 함수 (대표 — 전체는 migrations 참고)
이벤트·체크인·통계: get_nearby_events, verify_and_create_checkin, get_event_missions,
get_weekly_leaderboard, get_user_stats, get_visited_locations, get_recommended_events  
코스메틱·칭호: purchase_cosmetic, equip_cosmetic, unequip_cosmetic,
check_and_grant_titles, update_character_personality  
시즌·보상: get_active_season, add_season_xp, claim_season_reward, grant_quiz_coins,
claim_daily_reward, get_streak_info  
소셜·피드: get_community_feed, create_community_submission_mission_photo,
update_community_submission_music, toggle_feed_like, add_feed_comment, get_feed_comments,
send_friend_request, respond_friend_request, get_friends, create_crew, join_crew, get_my_crew,
update_my_location, get_friend_locations, toggle_location_sharing, block_user

### Edge Functions (11개)
apple-music-search, complete-event, generate-narrative, generate-quiz, generate-journal,
generate-events-batch, generate-ugc-event, character-chat,
send-notification, delete-account, recommend-events

### Storage 버킷
mission-photos (Public, 5MB, jpeg/png — HEIC 추가 필요)
avatars (Public, 2MB, jpeg/png)

---

## Zustand 스토어 (14개)
authStore, characterStore, inventoryStore, locationStore, mapStore,
missionStore, moderationStore, notificationStore, premiumStore,
profileStore, questStore, storage, supabaseAuthStorage, uiStore

---

## 알려진 이슈 (수정 시 참고)

- 본 문서의 **함수 개수·RPC 목록·`as any` 횟수**는 시점별로 코드와 어긋날 수 있다. 불확실하면 검색 도구로 확인한다.

### 타입 불일치
- EventCategory enum: TS에 12개 값 vs DB에 5개 → DB 기준으로 맞출 것
- MissionObjective: missionStore에서 import하지만 types에 미정의
- SeasonReward.track: season.tsx에서 사용하지만 api.ts에 없음
- as any 20회 사용 (11개 파일) → 수정 시 타입 가드로 교체

### 미연결 API (정의는 있으나 호출 안 됨)
- checkAndGrantTitles → 칭호 자동 부여 안 됨
- updatePersonality → 성격 분석 안 됨
- addSeasonXP → 시즌 XP 적립 안 됨
- generateQuiz → 퀴즈 미션은 DB config 사용 중
- getPersonalizedRecommendations → UI 미연결

### 플레이스홀더 화면 (실제 기능 없음)
- app/(tabs)/missions.tsx
- app/mission/[id].tsx
- app/character/index.tsx, customize.tsx
- app/settings/account.tsx, notifications.tsx
- app/shop/subscription.tsx

### 잠재적 버그
- 시즌 UI/API 불일치: season.tsx의 JSX가 ActiveSeasonResult와 다른 필드 접근
- 지도 레벨 배지: 항상 "1" 표시 (하드코딩)
- 이중 푸시 토큰: notificationService + api.ts 이중 호출
- DailyRewardModal: 존재하나 어떤 화면에도 import 안 됨
- HEIC 업로드: Storage 버킷에 image/heic MIME 미허용

---

## 코딩 규칙

### TypeScript
- strict 모드. any 사용 금지.
- 모든 함수에 반환 타입 명시.
- 새 타입은 src/types/enums.ts 또는 models.ts에 추가.
- 타입 가드 활용. as 캐스팅 최소화.

### 컴포넌트
- 한 파일 300줄 이하. 초과 시 분리.
- FlatList 사용 (ScrollView 안에 map 렌더링 금지 — 성능).
- 모든 화면: loading / empty / error / success 4가지 상태 처리.
- 스켈레톤 로딩 (shimmer) 적용.
- expo-haptics로 주요 인터랙션에 피드백.

### 상태 관리
- Zustand 사용. 새 스토어 생성 시 기존 패턴 따를 것.
- 서버 상태와 로컬 상태 분리.
- 낙관적 업데이트 패턴: 로컬 즉시 반영 → API → 실패 시 롤백.
- persist 필요 시 `@react-native-async-storage/async-storage` 패턴 사용 (레포에 MMKV 미사용).

### API
- src/lib/api.ts에 모든 API 함수 집중.
- Supabase 직접 호출 (단순 CRUD)
- Supabase RPC (PostGIS, 트랜잭션, 집계)
- Edge Function fetch (AI, 복합 로직)
- 에러는 throwIfError 헬퍼 또는 try-catch.

### Edge Functions
- Deno 런타임. TypeScript.
- CORS 헤더 필수. OPTIONS 핸들링 필수.
- 인증: Authorization 헤더에서 Bearer 토큰 추출 → supabaseAdmin.auth.getUser() (함수별로 `verify_jwt` / 공개 엔드포인트 예외는 `supabase/config.toml` 확인).
- 공통 환경: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY (AI 함수)
- `apple-music-search`: APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_KEY_ID, APPLE_MUSIC_PRIVATE_KEY (PEM; `\n` 이스케이프 지원), 선택 APPLE_MUSIC_STOREFRONT

### DB
- 마이그레이션: supabase/migrations/ 에 타임스탬프 파일.
- IF NOT EXISTS 사용 (재실행 가능하게).
- RLS 필수. 새 테이블 생성 시 반드시 정책 추가.
- PostGIS: geography(Point, 4326) 타입. GIST 인덱스.

### 네이밍
- 파일: kebab-case (my-component.tsx)
- 컴포넌트: PascalCase (MyComponent)
- 함수: camelCase (getMyData)
- 상수: UPPER_SNAKE_CASE (CHECK_IN_RADIUS_METERS)
- DB 테이블/컬럼: snake_case (user_badges)
- Edge Function 폴더: kebab-case (complete-event)

### Git / 배포
- 기능 완료 후: git add + commit + push
- OTA 배포: `npm run eas:update:prod` 또는 `eas update --channel production --message "변경 설명"`
- Edge Function 배포: `npx supabase functions deploy [함수명]` (로컬에 CLI 없을 때)
- DB 변경: supabase db push

---

## 작업 시 출력 형식

모든 작업 완료 후 아래를 반드시 출력하라:

```
## 작업 완료 요약

### 변경된 파일
- path/to/file.tsx — 변경 내용 한줄 설명

### 새로 생성된 파일
- path/to/new-file.tsx — 역할

### 배포 방법
- [ ] OTA 배포 가능 (JS 변경만)
- [ ] Edge Function 재배포 필요: supabase functions deploy [이름]
- [ ] DB 마이그레이션 필요: supabase db push
- [ ] ⚠️ Production 빌드 필요 (사유: ...)

### OTA 배포 명령어
eas update --channel production --message "변경 설명"

### 수동 테스트 체크리스트
1. ...
2. ...
3. ...
```

---

## 금지 사항

1. 새 네이티브 패키지를 npm install/expo install 하지 마라
2. app.json을 수정하지 마라
3. 기존 탭 구조 (map, explore, social, profile + character, inventory, quests) 를 변경하지 마라
4. 인증 플로우 (welcome → login → onboarding → tabs) 를 변경하지 마라
5. 기존 API 함수의 시그니처를 불필요하게 변경하지 마라
6. console.log를 프로덕션 코드에 남기지 마라 (디버깅 후 제거)
7. TODO, FIXME 주석을 새로 추가하지 마라 (구현하거나 말거나)
8. 플레이스홀더 화면을 새로 만들지 마라 (만들 거면 완성해서 만들어라)
9. 하드코딩된 한국어 문자열에 영어를 섞지 마라
10. 이미 있는 컴포넌트를 중복 생성하지 마라 (기존 것을 수정/확장)

---

## 현재 설치된 주요 네이티브 패키지 (이것만 사용 가능)

`package.json` 기준 — **새 네이티브 모듈 추가 금지** (하네스 절대 규칙과 동일).

expo-apple-authentication, expo-av, expo-build-properties, expo-camera, expo-clipboard,
expo-constants, expo-font, expo-haptics, expo-image, expo-image-picker, expo-linear-gradient,
expo-linking, expo-location, expo-notifications, expo-router, expo-secure-store, expo-sharing,
expo-splash-screen, expo-status-bar, expo-task-manager, expo-tracking-transparency, expo-updates,
expo-web-browser, @gorhom/bottom-sheet, @react-native-async-storage/async-storage,
@react-native-community/netinfo,
@react-native-kakao/core, @react-native-kakao/share, @react-native-kakao/social, @react-native-kakao/user,
react-native-gesture-handler, react-native-map-clustering, react-native-maps,
react-native-purchases, react-native-reanimated, react-native-safe-area-context,
react-native-screens, react-native-svg, react-native-view-shot, react-native-worklets,
@sentry/react-native, @supabase/supabase-js

위 목록에 없는 **네이티브** 패키지는 설치하지 마라.
JS-only 패키지 (date-fns, axios 등)는 필요 시 추가 가능하되 의존성 최소화.

---

## 캐릭터 시스템 참고

4종 스타터: 도담(explorer), 나래(foodie), 하람(artist), 별찌(socialite)
진화 단계: Baby(1-5) → Teen(6-15) → Adult(16-30) → Legendary(31+)
레벨 공식: Level N = N * 500 XP
코스메틱 슬롯: hat, outfit, accessory, background, aura
코스메틱 희귀도: common(#9CA3AF), rare(#3B82F6), epic(#8B5CF6), legendary(#F59E0B)
기분(mood): happy, excited, tired, curious, proud, adventurous
성격 특성: 탐험 패턴에서 자동 분석 (야행성, 사진 애호가, 장거리 러너 등)

---

## AI 토큰 효율 원칙

1. "1회 생성 → N명 소비" 구조 최대화
2. 이벤트 서사/퀴즈는 생성 후 DB 캐싱 (재호출 시 캐시 반환)
3. 실시간 AI 호출(캐릭터 대화)은 프리미엄 전용 (하루 20회 제한)
4. 배치 생성(이벤트 일괄 생성)은 관리자 전용
5. 탐험 일지는 유저당 하루 1회만 생성