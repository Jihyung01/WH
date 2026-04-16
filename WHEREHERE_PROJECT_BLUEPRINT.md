# WhereHere (웨어히어) — 프로젝트 블루프린트

> **문서 목적**: AI 에이전트가 프로젝트의 전체 맥락을 즉시 파악하고, 기존 기능을 유지하면서 확장·마이그레이션·리팩터링할 수 있도록 제작된 종합 기술 문서.
> **최종 갱신**: 2026-04-16 · 코드베이스 기준 실시간 분석

---

## 1. 서비스 정체성 & 브랜드

| 항목 | 값 |
|---|---|
| **앱 이름** | WhereHere (웨어히어) |
| **슬로건** | "여기, 지금, 탐험을 시작하세요" |
| **앱 컨셉** | 위치 기반 탐험·체크인 RPG. 서울의 숨겨진 명소를 발견하고, 미션을 수행하고, 캐릭터를 성장시키는 게이미파이드 탐험 앱 |
| **주 언어** | 한국어 (Korean-first) |
| **타겟 유저** | 서울 거주 MZ세대 (20-35세), 도시 탐험·산책·카페·핫플 관심 유저 |
| **브랜드 컬러** | Primary `#2DD4A8` (민트 그린), Dark BG `#0F172A`, Gold `#FFB800`, Purple `#8B5CF6` |
| **URL Scheme** | `wherehere://` |
| **Deep Link** | `wherehere://auth/callback`, `wherehere://join?code=XXX` |
| **번들 ID** | `com.wherehere.app` (iOS & Android 동일) |
| **EAS Project ID** | `ff328bbb-ad49-47b0-809a-aebfbf70bb8b` |
| **ASC App ID** | `6761450806` (App Store Connect) |

---

## 2. 기술 스택

### 2.1 프론트엔드 (React Native / Expo)

| 기술 | 버전 | 역할 |
|---|---|---|
| React Native | 0.81.5 | 코어 UI 레이어 |
| Expo SDK | 54 | 런타임, 빌드 시스템 |
| Expo Router | 6 | 파일 기반 라우팅 |
| Zustand | 5 | 전역 상태 관리 (persist middleware 사용) |
| react-native-reanimated | 4.1 | 고성능 애니메이션 (60fps) |
| react-native-maps | 1.20.1 | 지도 렌더링 |
| react-native-map-clustering | 4.0 | 마커 클러스터링 |
| @gorhom/bottom-sheet | 5.2 | 바텀 시트 |
| react-native-gesture-handler | 2.28 | 제스처 |
| react-native-svg | 15.12 | SVG 렌더링 |
| expo-linear-gradient | 15 | 그라디언트 배경 |
| expo-haptics | 15 | 진동 피드백 |
| TypeScript | 5.9 | 타입 안전성 |

### 2.2 백엔드 (Supabase + Edge Functions)

| 기술 | 역할 |
|---|---|
| **Supabase Auth** | 인증 (Kakao OAuth, Apple Sign-In, Email/Password) |
| **Supabase PostgreSQL** | 메인 DB (PostGIS 포함) |
| **Supabase Edge Functions** (Deno) | 서버리스 비즈니스 로직 (AI 호출, 구매 검증 등) |
| **Supabase Storage** | 이미지 업로드 (mission-photos 버킷) |
| **Supabase RPC** | 복잡 쿼리 & 트랜잭션 (30+ RPC 함수) |
| **Supabase RLS** | Row Level Security 정책 |

### 2.3 외부 서비스 & SDK

| 서비스 | 용도 | 키/설정 |
|---|---|---|
| **RevenueCat** | IAP & 구독 결제 | iOS: `appl_oJuyMXIsMCOPhiGtSxjdDusvFcd`, Android: `goog_nnQAGvxyoeMPaLSIKrcAFTQzRhe` |
| **Google Maps** | 지도 API | `AIzaSyCNloDZuWrMK_TYx-0HD_ip_LBegmGypOg` |
| **Kakao SDK** | OAuth + 카카오톡 공유 | `@react-native-kakao/core` (네이티브 앱 키는 env) |
| **Apple Sign-In** | iOS 인증 | `expo-apple-authentication` |
| **Sentry** | 크래시 추적 | DSN은 env (`EXPO_PUBLIC_SENTRY_DSN`) |
| **Mixpanel** | 분석/이벤트 트래킹 | 토큰은 env (`EXPO_PUBLIC_MIXPANEL_TOKEN`) |
| **Apple Music API** | 음악 검색 & 피드 첨부 | Edge Function `apple-music-search` |
| **Apple HealthKit** | iOS 걸음 수 | `react-native-health` |
| **Google Fit** | Android 걸음 수 | `react-native-google-fit` |

### 2.4 빌드 & 배포

| 항목 | 설정 |
|---|---|
| **EAS Build** | development / development-simulator / preview / production 프로필 |
| **EAS Update** | OTA 업데이트 (production 채널) |
| **New Architecture** | 활성화 (`newArchEnabled: true`) |
| **Runtime Version** | `appVersion` 정책 |
| **Android** | AAB (production), APK (development) |
| **iOS** | TestFlight → App Store |
| **App Version** | `1.2.0` (app.json) |
| **패치 시스템** | `patch-package` (postinstall) |

---

## 3. 환경변수 & API 키 전체 목록

### 3.1 `.env` (로컬 개발)

```env
EXPO_PUBLIC_SUPABASE_URL=https://mdhnxxeyjkmsznbresaq.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_API_URL=https://wherehere-api.railway.app
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
EXPO_PUBLIC_REVENUECAT_IOS=appl_oJuyMXIsMCOPhiGtSxjdDusvFcd
EXPO_PUBLIC_REVENUECAT_ANDROID=goog_nnQAGvxyoeMPaLSIKrcAFTQzRhe
```

### 3.2 추가 사용 가능 환경변수 (선택)

| 변수 | 용도 |
|---|---|
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry 크래시 리포팅 |
| `EXPO_PUBLIC_MIXPANEL_TOKEN` | Mixpanel 분석 |
| `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY` | 카카오 네이티브 SDK 키 |
| `EXPO_PUBLIC_USE_KAKAO_NATIVE_AUTH` | Android 카카오 OIDC 사용 여부 (기본 true) |
| `EXPO_PUBLIC_SENTRY_DEBUG` | Sentry 디버그 모드 |
| `SENTRY_ALLOW_FAILURE` | 빌드 시 Sentry 실패 허용 |

### 3.3 하드코딩된 키 (app.json)

- **Google Maps API Key**: `AIzaSyCNloDZuWrMK_TYx-0HD_ip_LBegmGypOg` (iOS/Android config 내)
- **Supabase 키**: EAS build profiles 내 env에 inline 포함

---

## 4. 프로젝트 구조 (파일 맵)

```
wherehere-app/
├── app/                         # Expo Router 스크린 (파일 기반 라우팅)
│   ├── _layout.tsx              # 루트 레이아웃 (ThemeProvider, GestureHandler, bootstrap)
│   ├── index.tsx                # 엔트리 포인트 → /(auth)/welcome 리다이렉트
│   ├── (auth)/                  # 인증 플로우
│   │   ├── _layout.tsx          # 인증 스택 레이아웃
│   │   ├── welcome.tsx          # 웰컴/랜딩 화면
│   │   ├── login.tsx            # 카카오/Apple 로그인 (14KB)
│   │   ├── onboarding.tsx       # 캐릭터 생성 위자드 (19KB)
│   │   └── personality-quiz.tsx # 탐험가 유형 진단 퀴즈
│   ├── (tabs)/                  # 메인 탭 네비게이션
│   │   ├── _layout.tsx          # 5탭: 지도, 피드, 소셜, 캐릭터, 프로필
│   │   ├── map.tsx              # 지도 탭 (22KB) - 메인 맵 뷰
│   │   ├── explore.tsx          # 피드 탭 (27KB) - 커뮤니티 피드
│   │   ├── social.tsx           # 소셜 탭 (55KB) - 친구/크루
│   │   ├── character.tsx        # 캐릭터 탭 (12KB)
│   │   ├── profile.tsx          # 프로필 탭 (44KB) - 통계, 걸음수, 설정
│   │   ├── quests.tsx           # 퀘스트 (hidden tab)
│   │   ├── inventory.tsx        # 인벤토리 (hidden tab, 20KB)
│   │   └── missions.tsx         # 미션 (hidden tab)
│   ├── event/
│   │   ├── [id].tsx             # 이벤트 상세 (35KB)
│   │   └── checkin/[id].tsx     # 체크인 화면
│   ├── mission/
│   │   ├── [id].tsx             # 미션 상세
│   │   ├── ar-photo.tsx         # AR 포토 미션 (16KB)
│   │   └── complete/[id].tsx    # 미션 완료 화면
│   ├── reward/[id].tsx          # 보상 화면
│   ├── shop/
│   │   ├── index.tsx            # 상점 메인 (37KB)
│   │   └── subscription.tsx     # 구독 안내
│   ├── social/                  # 소셜 서브 스크린
│   ├── social.tsx               # 소셜 풀스크린 (45KB)
│   ├── chat.tsx                 # 캐릭터 AI 채팅 (16KB)
│   ├── create-event.tsx         # UGC 이벤트 생성 (39KB)
│   ├── journal.tsx              # 탐험 일지 (23KB)
│   ├── season.tsx               # 시즌 패스 (31KB)
│   ├── premium.tsx              # 프리미엄 구독 (21KB)
│   ├── titles.tsx               # 칭호 관리 (10KB)
│   ├── character-customize.tsx  # 코스메틱 커스텀 (8KB)
│   ├── user/[id].tsx            # 타유저 프로필
│   └── settings/
│       ├── index.tsx            # 설정 메인 (25KB)
│       ├── account.tsx          # 계정 관리
│       └── notifications.tsx    # 알림 설정
│
├── src/
│   ├── components/              # 재사용 컴포넌트 (14개 서브폴더)
│   │   ├── auth/                # AuthButton, AuthInput
│   │   ├── character/           # EvolutionCelebrationOverlay
│   │   ├── common/              # 공통 UI
│   │   ├── cosmetic/            # 코스메틱 UI
│   │   ├── event/               # 이벤트 카드
│   │   ├── map/                 # 맵 오버레이
│   │   ├── mission/             # 미션 카드
│   │   ├── music/               # Apple Music 위젯
│   │   ├── onboarding/          # 온보딩 위젯
│   │   ├── quest/               # 퀘스트 UI
│   │   ├── rewards/             # 보상 UI
│   │   ├── share/               # 공유 카드
│   │   ├── ui/                  # 기본 UI 프리미티브
│   │   └── ar/                  # AR 관련
│   │
│   ├── config/                  # 설정 & 초기화
│   │   ├── theme.ts             # 디자인 시스템 (색상, 간격, 타이포, 그림자 등)
│   │   ├── supabase.ts          # Supabase 클라이언트 초기화
│   │   ├── purchases.ts         # RevenueCat IAP 래퍼 (435줄)
│   │   ├── revenuecatProductIds.ts # 상품 ID 매핑
│   │   ├── analytics.ts         # Mixpanel 초기화 & 이벤트 정의
│   │   ├── sentry.ts            # Sentry 초기화
│   │   └── api.ts               # API base config
│   │
│   ├── lib/
│   │   └── api.ts               # ★ 핵심 API 레이어 (1666줄, 64KB) — 모든 Supabase 호출
│   │
│   ├── services/                # 외부 서비스 래퍼 (19개)
│   │   ├── authService.ts       # 인증 서비스 헬퍼
│   │   ├── backgroundLocation.ts # 백그라운드 위치 추적 (친구 공유, 근접 알림)
│   │   ├── characterService.ts  # 캐릭터 CRUD
│   │   ├── checkinService.ts    # 체크인 처리
│   │   ├── eventService.ts      # 이벤트 CRUD
│   │   ├── friendLocation.ts    # 친구 실시간 위치 (Zenly-style)
│   │   ├── geofencing.ts        # iOS 지오펜싱
│   │   ├── healthService.ts     # HealthKit/GoogleFit 걸음수 (424줄)
│   │   ├── kakaoCore.ts         # 카카오 SDK 초기화 & OIDC
│   │   ├── kakaoFriends.ts      # 카카오 친구 목록
│   │   ├── kakaoShare.ts        # 카카오톡 공유
│   │   ├── missionService.ts    # 미션 처리
│   │   ├── notificationService.ts # 푸시 알림 관리
│   │   ├── placesService.ts     # 장소 검색 (Google Places)
│   │   ├── rewardService.ts     # 보상 처리
│   │   ├── shopService.ts       # 상점 처리
│   │   ├── voiceService.ts      # TTS 음성 서비스
│   │   └── weather.ts           # 날씨 API
│   │
│   ├── stores/                  # Zustand 상태 (15개)
│   │   ├── authStore.ts         # ★ 인증 상태 (506줄) — Kakao/Apple/Email 로그인
│   │   ├── characterStore.ts    # ★ 캐릭터 상태 (370줄) — 로드아웃, 코인, 성격
│   │   ├── premiumStore.ts      # 프리미엄 구독 상태
│   │   ├── questStore.ts        # 퀘스트/이벤트 상태
│   │   ├── mapStore.ts          # 지도 상태 (날씨 필터링 등)
│   │   ├── locationStore.ts     # 위치 상태
│   │   ├── inventoryStore.ts    # 인벤토리 상태
│   │   ├── missionStore.ts      # 미션 상태
│   │   ├── notificationStore.ts # 알림 설정 상태
│   │   ├── profileStore.ts      # 프로필 상태
│   │   ├── moderationStore.ts   # 차단/신고 상태
│   │   ├── weatherStore.ts      # 날씨/시간 상태
│   │   ├── uiStore.ts           # UI 상태 (다크모드 등)
│   │   ├── storage.ts           # Zustand persist storage 어댑터
│   │   └── supabaseAuthStorage.ts # Supabase 세션 스토리지
│   │
│   ├── hooks/                   # 커스텀 훅 (10개)
│   │   ├── useAuth.ts           # 인증 훅
│   │   ├── useCharacter.ts      # 캐릭터 훅
│   │   ├── useCheckIn.ts        # 체크인 훅
│   │   ├── useEvents.ts         # 이벤트 훅
│   │   ├── useLocation.ts       # 위치 훅
│   │   ├── useMissions.ts       # 미션 훅
│   │   ├── useNarrative.ts      # AI 나레이티브 훅
│   │   ├── useNotifications.ts  # 알림 훅
│   │   ├── useShareJournal.ts   # 일지 공유 훅
│   │   └── useAnalytics.ts      # 분석 훅
│   │
│   ├── types/                   # TypeScript 타입
│   │   ├── models.ts            # DB 모델 타입 (366줄)
│   │   ├── enums.ts             # 상수/열거형 (147줄)
│   │   ├── api.ts               # API 타입
│   │   └── index.ts             # 배럴 export
│   │
│   ├── data/                    # 정적 데이터
│   │   ├── character-dialogues.ts    # 캐릭터별 대화 텍스트
│   │   ├── character-weather-reactions.ts # 날씨 반응 데이터
│   │   └── personality-quiz.ts       # 성격 진단 퀴즈 데이터
│   │
│   ├── utils/                   # 유틸리티 (13개)
│   │   ├── characterAssets.ts   # 캐릭터 이모지 & 진화 스테이지
│   │   ├── clearUserLocalCaches.ts # 로그아웃 시 로컬 캐시 정리
│   │   ├── constants.ts         # 앱 상수
│   │   ├── contentModeration.ts # 콘텐츠 필터링
│   │   ├── errorReporting.ts    # 에러 보고
│   │   ├── format.ts            # 숫자/날짜 포맷
│   │   ├── geo.ts               # 거리 계산 (Haversine)
│   │   ├── hapticsSafe.ts       # 안전한 햅틱 래퍼
│   │   ├── moderationFilters.ts # 차단 사용자 필터
│   │   ├── reverseGeocodeDistrict.ts # 역지오코딩
│   │   ├── startupTelemetry.ts  # 앱 시작 지표
│   │   ├── trackingConsent.ts   # ATT 트래킹 동의
│   │   └── validation.ts       # 입력 검증
│   │
│   └── providers/
│       └── ThemeProvider.tsx     # 다크/라이트 테마 컨텍스트
│
├── supabase/
│   ├── functions/               # 13개 Edge Functions (Deno)
│   │   ├── apple-music-search/  # Apple Music 카탈로그 검색
│   │   ├── character-chat/      # AI 캐릭터 채팅 (GPT)
│   │   ├── complete-event/      # 이벤트 완료 보상 처리
│   │   ├── delete-account/      # 계정 삭제 (GDPR/앱스토어 요건)
│   │   ├── generate-events-batch/ # AI 이벤트 대량 생성
│   │   ├── generate-evolution-image/ # 진화 이미지 생성
│   │   ├── generate-journal/    # AI 탐험 일지 생성
│   │   ├── generate-narrative/  # AI 이벤트 나레이티브
│   │   ├── generate-quiz/       # AI 퀴즈 생성
│   │   ├── generate-ugc-event/  # UGC 이벤트 AI 보조 생성
│   │   ├── recommend-events/    # AI 추천 이벤트
│   │   ├── send-notification/   # 서버 푸시 발송
│   │   └── verify-purchase/     # IAP 영수증 검증 & 코인/프리미엄 부여
│   │
│   └── migrations/              # 30개 SQL 마이그레이션 파일
│
├── assets/                      # 앱 아이콘, 스플래시
├── docs/                        # 기술 문서
│   ├── AUTH_FLOW.md             # 인증 플로우
│   ├── AUTH_SETUP.md            # 인증 설정 가이드
│   ├── AUTH_TESTING.md          # 인증 테스팅
│   ├── AUTH_QUICK_REFERENCE.md  # 인증 퀵 레퍼런스
│   ├── DEPLOYMENT_AND_PRODUCT_ROADMAP.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── OPUS_AGENT_BRIEF.md
│   ├── ROADMAP.md
│   └── store-submission/        # 스토어 제출 자료
│
├── scripts/                     # 빌드/유틸 스크립트
├── patches/                     # patch-package 패치
├── apple-jwt/                   # Apple JWT 인증 관련
│
├── app.json                     # Expo 정적 설정
├── app.config.js                # Expo 동적 설정 (카카오, 빌드 속성 병합)
├── eas.json                     # EAS Build/Submit 설정
├── package.json                 # 의존성 (v1.0.0)
├── tsconfig.json                # TypeScript 설정
├── metro.config.js              # Metro 번들러 설정
└── index.js                     # 엔트리 포인트
```

---

## 5. 핵심 기능 상세

### 5.1 인증 & 온보딩 (Auth & Onboarding)

**인증 방식 (3가지):**
1. **카카오 OAuth** — Android: 네이티브 OIDC → Supabase `signInWithIdToken` / 웹 OAuth fallback. iOS: `openAuthSessionAsync` 웹 OAuth.
2. **Apple Sign-In** — iOS only. `expo-apple-authentication` → Supabase `signInWithIdToken`.
3. **이메일/비밀번호** — Supabase `signInWithPassword` (개발/테스트용)

**온보딩 플로우:**
1. Welcome → Login → Personality Quiz(선택) → Character Selection → Map
2. 성격 진단 퀴즈 → `profiles.explorer_type` JSONB 저장
3. 4개 스타터 캐릭터: 도담(탐험가), 나래(미식가), 하람(예술가), 별찌(소셜러)
4. DB `starter_character_catalog` 테이블에서 스탯 로드

**세션 관리:**
- Supabase PKCE flow + `expo-secure-store` 기반 세션 persist
- 자동 토큰 리프레시
- 401 시 자동 refresh retry (2회)
- 로그아웃 시 Kakao SDK 로그아웃 + RevenueCat 로그아웃 + 로컬 캐시 전체 클리어

### 5.2 지도 & 탐험 (Map & Exploration)

- **react-native-maps** (Google Maps on Android, Apple Maps on iOS)
- **PostGIS** 기반 RPC `get_nearby_events`: 반경(km) 내 이벤트 검색
- **마커 클러스터링**: `react-native-map-clustering`
- **날씨 연동**: 날씨·시간대에 따라 이벤트 노출 조건 필터링 (`visibility_conditions` JSONB)
- **백그라운드 위치**: `expo-task-manager` + `expo-location` → 근접 알림 (Android) / 지오펜싱 (iOS)
- **친구 실시간 위치**: Zenly-style 실시간 위치 공유 (DB `update_my_location` RPC)

### 5.3 이벤트 & 체크인 (Events & Check-in)

**이벤트 구조:**
- 카테고리: `exploration`, `photo`, `quiz`, `partnership`, `culture`, `hidden_gem`, `food`, `cafe`, `nature`, `nightlife`, `shopping`
- 난이도: 1~5
- 포인트: `reward_xp`
- 유형: system(운영팀), ugc(사용자)
- 시즌 이벤트: `is_seasonal`, `season_id`

**체크인:**
- GPS 검증 (서버 RPC `verify_and_create_checkin`)
- 거리 검증 + 결과 반환 (`CheckInResult`)
- 체크인 시 코인 보상 (`grant_checkin_coins`)

**미션 시스템:**
- 미션 유형: `gps_checkin`, `photo`, `quiz`, `text`, `timer`
- 사진 미션: 카메라 촬영 → Supabase Storage 업로드 → `mission_completions` 저장
- AR 포토: `expo-camera` 기반 전체화면 카메라
- 퀴즈: Edge Function AI 생성 (`generate-quiz`)
- 이벤트 완료 → Edge Function `complete-event` → XP/코인/배지/코스메틱 드롭/칭호 부여

### 5.4 캐릭터 시스템 (Character System)

**캐릭터 클래스 (4종):**
| 이름 | 타입 | 특성 |
|---|---|---|
| 도담 (Dodam) | explorer | 탐험 특화 |
| 나래 (Narae) | foodie | 미식 특화 |
| 하람 (Haram) | artist | 예술 특화 |
| 별찌 (Byeolzzi) | socialite | 소셜 특화 |

**스탯 시스템:**
- `stat_exploration`, `stat_discovery`, `stat_knowledge`, `stat_connection`, `stat_creativity`

**진화 시스템:**
- 4단계: Baby(1~5) → Teen(6~15) → Adult(16~30) → Legendary(31+)
- 진화 시 축하 오버레이 (`EvolutionCelebrationOverlay`)
- XP per level: `level * 500`

**코스메틱 시스템:**
- 슬롯: `hat`, `outfit`, `accessory`, `background`, `aura`
- 희귀도: `common`, `uncommon`, `rare`, `epic`, `legendary`
- 효과: `xp_boost`, `discovery_range`, `streak_shield`, `coin_bonus`, `cosmetic_only`
- 장착/해제: optimistic update + 서버 확인
- 코인으로 구매 가능

**성격 시스템:**
- 무드: `happy`, `excited`, `tired`, `curious`, `proud`, `adventurous`
- 성격 특성: 서버 RPC `update_character_personality`로 탐험 기록 기반 갱신
- 선호 지역: `favorite_district`

**칭호 시스템:**
- 카테고리: `exploration`, `district`, `social`, `achievement`, `season`
- 조건부 자동 부여: RPC `check_and_grant_titles`
- 활성 칭호 표시

### 5.5 소셜 시스템 (Social)

**친구:**
- 닉네임으로 친구 요청 (`send_friend_request`)
- 수락/거절 (`respond_friend_request`)
- 친구 목록 + 대기 요청 조회
- 친구 수락 시 추천 코인 보상 (`grant_referral_coins`)

**크루:**
- 크루 생성 (이름, 설명, 이모지, 홈 지역)
- 초대 코드로 가입 (`wherehere://join?code=XXX`)
- 크루 멤버 역할: leader, officer, member
- 크루 기여 XP, 주간 XP

**커뮤니티 피드:**
- 인스타그램 스타일 사진 피드 (`community_submissions` 테이블)
- 좋아요/댓글 (`toggle_feed_like`, `add_feed_comment`)
- Apple Music 첨부 기능 (`music_json`)
- 공개 범위: public, friends, private
- 콘텐츠 신고 & 유저 차단 (`content_reports`, `user_blocks`)

**코스메틱 선물:**
- 친구에게 코스메틱 아이템 선물 (`gift_cosmetic`)
- 수신자에게 푸시 알림 발송

**타유저 프로필:**
- 공개 프로필 조회 RPC (`get_public_profile`)
- 유저별 피드 조회 (`get_user_community_feed`)
- 최근 활동 (`get_user_recent_event_activity`)

### 5.6 AI 기능 (AI Features)

| Edge Function | 용도 |
|---|---|
| `generate-narrative` | 이벤트별 AI 내러티브 생성 |
| `generate-quiz` | 장소 관련 AI 퀴즈 출제 |
| `character-chat` | 캐릭터와 AI 대화 (일일 제한) |
| `generate-journal` | 일일 탐험 일지 AI 요약 |
| `generate-ugc-event` | UGC 이벤트 AI 보조 생성 |
| `generate-events-batch` | 운영용 이벤트 대량 생성 |
| `recommend-events` | AI 개인화 추천 |
| `generate-evolution-image` | 진화 이미지 AI 생성 |

### 5.7 경제 시스템 (Economy)

**인앱 결제 (RevenueCat):**
- 구독: `wh_premium_monthly`, `wh_premium_annually`
- 코인 팩: `wh_coins_500_pack`, `wh_coins_1200`, `wh_coins_3500`, `wh_coins_8000`, `wh_coins_20000`
- Edge Function `verify-purchase`로 영수증 검증 & DB 반영

**코인 획득 방법:**
- 체크인 보상 (`grant_checkin_coins`)
- 퀴즈 정답 보상 (`grant_quiz_coins`)
- 일일 보상 (`claim_daily_reward`)
- 걸음 수 보상 (`claim_daily_step_reward` — 1K/3K/5K/10K 마일스톤)
- 친구 추천 보상 (`grant_referral_coins`)
- 직접 구매 (IAP)

**코인 사용처:**
- 코스메틱 구매
- 코스메틱 선물

**프리미엄 구독:**
- RevenueCat entitlement: `premium`
- DB `is_premium` 플래그
- 시즌 패스 프리미엄 트랙 해금

### 5.8 시즌 패스 (Season Pass)

- 레벨 30 캡 (레벨당 200 XP)
- 무료 트랙 + 프리미엄 트랙 보상
- 보상 타입: XP, 배지, 스킨
- 일일 보상/이벤트 완료 시 시즌 XP 적립
- RPC: `get_active_season`, `add_season_xp`, `claim_season_reward`

### 5.9 건강 연동 (Health Integration)

- **iOS**: Apple HealthKit (`react-native-health`) — 걸음 수 읽기
- **Android**: Google Fit (`react-native-google-fit`) — 걸음 수 읽기
- 일일 걸음 수 마일스톤 보상: 1000보(5XP), 3000보(15XP), 5000보(30XP+10코인), 10000보(50XP+30코인+"만보기" 배지)
- 주간 걸음 수 그래프 (프로필 탭)

### 5.10 알림 시스템 (Notifications)

- **Expo Notifications**: 로컬 + 원격 푸시
- 일일 리마인더 스케줄링
- 스트릭 경고
- 근접 이벤트 알림 (백그라운드)
- 서버 → 유저 직접 푸시 (Edge Function `send-notification`)
- 알림 탭 시 딥링크 네비게이션

### 5.11 기타 기능

- **탐험 일지**: AI 생성 일일 요약 + 공유 카드
- **리더보드**: 주간 XP 기준 순위 (지역별 필터)
- **UGC 이벤트**: 사용자가 장소를 등록하고 AI가 미션 자동 생성
- **카카오톡 공유**: 이벤트/일지 공유
- **Apple Music**: 피드 게시물에 음악 첨부
- **TTS**: 내러티브 음성 읽기 (`expo-speech`)
- **다크/라이트 모드**: ThemeProvider로 전환
- **콘텐츠 모더레이션**: 신고, 차단, 커뮤니티 약관 동의

---

## 6. 데이터베이스 스키마 요약

### 6.1 주요 테이블 (30개 마이그레이션 기준)

| 테이블 | 역할 |
|---|---|
| `profiles` | 유저 프로필 (xp, level, coins, push_token, explorer_type) |
| `characters` | 유저 캐릭터 (1인 1캐릭터 제약) |
| `starter_character_catalog` | 스타터 캐릭터 카탈로그 |
| `events` | 이벤트/퀘스트 (PostGIS location) |
| `checkins` | 체크인 기록 |
| `missions` | 이벤트별 미션 |
| `mission_completions` | 미션 완료 기록 |
| `event_completions` | 이벤트 완료 기록 |
| `badges` | 배지 정의 |
| `user_badges` | 유저 배지 |
| `inventory_items` | 유저 인벤토리 |
| `daily_rewards` | 일일 보상 기록 |
| `journals` | AI 탐험 일지 |
| `character_chats` | AI 채팅 기록 |
| `seasons` | 시즌 정의 |
| `season_passes` | 유저 시즌 패스 |
| `friendships` | 친구 관계 |
| `crews` | 크루 |
| `crew_members` | 크루 멤버 |
| `friend_locations` | 친구 실시간 위치 |
| `character_cosmetics` | 코스메틱 아이템 정의 |
| `user_cosmetics` | 보유 코스메틱 |
| `character_loadout` | 장착 코스메틱 |
| `character_titles` | 칭호 정의 |
| `user_titles` | 보유 칭호 |
| `community_submissions` | 커뮤니티 피드 게시물 |
| `feed_likes` | 피드 좋아요 |
| `feed_comments` | 피드 댓글 |
| `coin_products` | 코인 상품 카탈로그 |
| `coin_purchases` | 코인 구매 기록 |
| `content_reports` | 콘텐츠 신고 |
| `user_blocks` | 유저 차단 |
| `daily_step_rewards` | 걸음 수 보상 기록 |
| `character_evolution_images` | 진화 이미지 |

### 6.2 주요 RPC 함수

| RPC | 역할 |
|---|---|
| `get_nearby_events` | 반경 내 이벤트 (PostGIS) |
| `get_recommended_events` | 추천 이벤트 |
| `verify_and_create_checkin` | 체크인 GPS 검증 |
| `get_event_missions` | 이벤트 미션 + 완료 상태 |
| `claim_daily_reward` | 일일 보상 수령 |
| `get_streak_info` | 출석 스트릭 조회 |
| `get_user_stats` | 유저 통계 |
| `get_weekly_leaderboard` | 주간 리더보드 |
| `get_visited_locations` | 방문 기록 |
| `purchase_cosmetic` | 코스메틱 구매 |
| `equip_cosmetic` / `unequip_cosmetic` | 장착/해제 |
| `check_and_grant_titles` | 칭호 조건 체크 & 부여 |
| `update_character_personality` | 성격 갱신 |
| `get_active_season` | 활성 시즌 조회 |
| `add_season_xp` | 시즌 XP 추가 |
| `send_friend_request` | 친구 요청 |
| `respond_friend_request` | 친구 승인/거절 |
| `create_crew` / `join_crew` | 크루 생성/가입 |
| `get_community_feed` | 커뮤니티 피드 조회 |
| `toggle_feed_like` | 좋아요 토글 |
| `add_feed_comment` | 댓글 추가 |
| `get_public_profile` | 공개 프로필 조회 |
| `gift_cosmetic` | 코스메틱 선물 |
| `block_user` | 유저 차단 |
| `update_my_location` | 위치 업데이트 |
| `grant_checkin_coins` | 체크인 코인 |
| `grant_quiz_coins` | 퀴즈 코인 |
| `grant_referral_coins` | 추천 코인 |
| `claim_daily_step_reward` | 걸음 수 보상 |

---

## 7. UI/UX 아키텍처

### 7.1 네비게이션 구조

```
Root Stack (_layout.tsx)
├── index → Redirect to /(auth)/welcome
├── (auth) Stack
│   ├── welcome
│   ├── login
│   ├── personality-quiz
│   └── onboarding
├── (tabs) Tab Navigator
│   ├── map (지도) ★ 메인
│   ├── explore (피드)
│   ├── social (소셜)
│   ├── character (캐릭터)
│   └── profile (프로필)
├── event/[id] (slide_from_bottom)
├── event/checkin/[id] (fullScreenModal)
├── mission/[id]
├── mission/complete/[id] (fullScreenModal)
├── mission/ar-photo (fullScreenModal)
├── reward/[id] (fullScreenModal)
├── chat (modal, slide_from_bottom)
├── create-event (slide_from_bottom)
├── journal (slide_from_right)
├── season (slide_from_bottom)
├── premium (modal)
├── social (slide_from_right)
├── user/[id] (slide_from_right)
├── settings (slide_from_right)
├── character-customize (slide_from_right)
├── shop (slide_from_bottom)
└── titles (slide_from_right)
```

### 7.2 디자인 시스템 (`src/config/theme.ts`)

**브랜드 팔레트:**
```
Primary: #2DD4A8 (민트 그린)
Primary Dark: #1AAD8A
Primary Light: #7EE8CA
Gold: #FFB800
Purple: #8B5CF6
Coral: #FF6B6B
```

**다크 모드 배경:**
```
Background: #0F172A
Surface: #1E293B
Surface Light: #273449
Surface Highlight: #334155
```

**라이트 모드 배경:**
```
Background: #FAFBFC
Surface: #FFFFFF
Surface Light: #F1F5F9
Surface Highlight: #E2E8F0
```

**타이포그래피:**
- Primary: `Pretendard`
- Narrative: `NotoSerifKR`
- Mono: `SpaceMono`

**애니메이션:**
- Press scale: 0.97, 80ms
- Transition: 300ms
- Stagger: 60ms

---

## 8. 스토어 런칭 상태

### 8.1 iOS (App Store)

| 항목 | 상태 |
|---|---|
| Bundle ID | `com.wherehere.app` |
| ASC App ID | `6761450806` |
| EAS Submit 설정 | ✅ 설정됨 (`eas.json` > submit.production.ios) |
| 빌드 프로필 | ✅ production (AAB for Android, standard for iOS) |
| Apple Sign-In | ✅ `usesAppleSignIn: true` |
| HealthKit | ✅ entitlement 설정됨 |
| ATT 설문 | ✅ `expo-tracking-transparency` |
| IDFA | ✅ 선언됨 (`ITSAppUsesNonExemptEncryption: false`) |
| RevenueCat IAP | ✅ 키 설정됨 |

### 8.2 Android (Google Play)

| 항목 | 상태 |
|---|---|
| Package | `com.wherehere.app` |
| Build Type | AAB (production) / APK (development) |
| Google Maps | ✅ API key 하드코딩 |
| 카카오 SDK | ✅ Maven repo + 네이티브 앱 키 |
| Google Fit | ✅ `react-native-google-fit` |
| Background Location | ✅ 권한 & foreground service 설정 |
| RevenueCat IAP | ✅ 키 설정됨 |

### 8.3 현재 런칭 상태 추정

> [!IMPORTANT]
> - EAS Build, Submit, Update 설정이 **모두 production-ready** 상태
> - App Store Connect App ID 존재 (`6761450806`)
> - RevenueCat 실제 API 키 사용 중 (sandbox/production)
> - 하지만 **Git remote 없음** — 소스 코드가 로컬에만 존재

---

## 9. 앱 부트스트랩 플로우

```
App Launch
  └→ _layout.tsx (RootLayout)
       ├→ SplashScreen.preventAutoHideAsync()
       ├→ ThemeProvider
       └→ AppContent
            ├→ SplashScreen.hideAsync()
            ├→ requestAppTrackingTransparency
            ├→ initAnalytics (Mixpanel)
            ├→ initPurchases (RevenueCat)
            ├→ loadThemeOverride
            ├→ loadNotificationPrefs
            ├→ notificationService.configure()
            ├→ registerPushToken
            ├→ scheduleDailyReminder
            ├→ geofencing (iOS)
            ├→ syncContinuousLocationTask (development build only)
            └→ Deep link listener (crew join)
```

```
Navigation Flow:
  index.tsx → Redirect("/(auth)/welcome")
  welcome.tsx → checks auth → 
    if (authenticated + onboarded) → /(tabs)/map
    if (authenticated + !onboarded) → personality-quiz or onboarding
    if (!authenticated) → stay at welcome
```

---

## 10. 알려진 이슈 & 기술 부채

1. **Git Remote 미설정** — 소스 코드 원격 저장소 없음 (로컬 Git만)
2. **OAuth는 Development Build 필요** — Expo Go에서 카카오/Apple 로그인 불가
3. **Username 중복 체크** — 백엔드 RPC 있으나 온보딩에서 mocked
4. **테스트 코드 없음** — Unit/E2E 테스트 미구현
5. **Codex 의존성** — `package.json`에 `codex: ^0.2.3` 존재 (용도 불명)
6. **Android 권한 중복** — `app.json` permissions 배열에 중복 항목 다수
7. **Railway API** — `.env`에 `EXPO_PUBLIC_API_URL` 설정되어 있으나 실제 사용 코드는 `src/lib/api.ts`에서 직접 Supabase 호출
8. **Sentry DSN 미설정** — `EXPO_PUBLIC_SENTRY_DSN` 없으면 비활성
9. **Mixpanel 토큰 미설정** — `EXPO_PUBLIC_MIXPANEL_TOKEN` 없으면 비활성

---

## 11. 확장 & 마이그레이션 가이드

### 11.1 새 기능 추가 시

1. **타입**: `src/types/enums.ts` 또는 `models.ts`에 추가
2. **DB**: `supabase/migrations/` 에 새 SQL 파일
3. **API**: `src/lib/api.ts`에 함수 추가 (Supabase RPC 또는 Edge Function 호출)
4. **상태**: `src/stores/`에 Zustand store 추가 (persist middleware 패턴 따름)
5. **UI**: `app/` 폴더에 새 라우트 추가 + `_layout.tsx`에 Stack.Screen 등록
6. **컴포넌트**: `src/components/[feature]/`에 재사용 컴포넌트 추가

### 11.2 Edge Function 추가 시

1. `supabase/functions/[name]/index.ts` 생성 (Deno)
2. `src/lib/api.ts`에서 `invokeEdgeFunction<ResultType>('name', body)` 호출
3. JWT verify_jwt gateway 자동 적용 (apikey + Bearer token 포함)

### 11.3 결제 상품 추가 시

1. App Store Connect / Play Console에 상품 등록
2. RevenueCat Products & Offerings 설정
3. `src/config/revenuecatProductIds.ts`에 ID 추가
4. `src/lib/api.ts`에 검증 로직 추가 (필요시)
5. Edge Function `verify-purchase`에 처리 로직 추가

### 11.4 프로젝트 이전 시 필요 작업

1. **소스 코드**: Git 저장소 생성 & push
2. **Supabase**: 새 프로젝트 생성 → 마이그레이션 30개 순서대로 실행 → Edge Functions 13개 배포
3. **환경변수**: `.env` / EAS Build env 모두 새 Supabase URL·키로 교체
4. **EAS**: `eas.json` 내 project ID, env 변수 교체
5. **RevenueCat**: 새 앱 생성 또는 기존 앱 유지 → API key 교체
6. **Google Maps**: 새 API key 발급 (필요시) → `app.json` 교체
7. **카카오**: 새 앱 키 발급 (필요시) → env 교체
8. **Sentry/Mixpanel**: DSN/토큰 설정
9. **스토어**: 새 번들 ID 사용 시 App Store/Play Store 새 앱 등록

---

## 12. Supabase 연결 정보

| 항목 | 값 |
|---|---|
| **Project URL** | `https://mdhnxxeyjkmsznbresaq.supabase.co` |
| **Anon Key** | `eyJhbGciOiJIUzI1NiIs...tGEgVhaHQoyCdxN7glY0bYdLN5wbTG11BVP4wGXFz5o` |
| **Project Ref** | `mdhnxxeyjkmsznbresaq` |
| **Auth Flow** | PKCE |
| **Storage Bucket** | `mission-photos` (사진 업로드용) |
| **Edge Functions** | 13개 배포됨 |

---

## 13. 의존성 전체 목록 (package.json)

### Production (40개)
```
@expo/vector-icons, @gorhom/bottom-sheet, @react-native-async-storage/async-storage,
@react-native-community/netinfo, @react-native-kakao/core, @react-native-kakao/share,
@react-native-kakao/social, @react-native-kakao/user, @sentry/react-native,
@supabase/supabase-js, axios, codex, date-fns, expo, expo-apple-authentication,
expo-av, expo-build-properties, expo-camera, expo-clipboard, expo-constants,
expo-font, expo-haptics, expo-health, expo-image, expo-image-picker,
expo-linear-gradient, expo-linking, expo-location, expo-notifications,
expo-router, expo-secure-store, expo-sharing, expo-speech, expo-splash-screen,
expo-status-bar, expo-task-manager, expo-tracking-transparency, expo-updates,
expo-web-browser, lightningcss, mixpanel-react-native, react, react-native,
react-native-gesture-handler, react-native-google-fit, react-native-health,
react-native-map-clustering, react-native-maps, react-native-purchases,
react-native-reanimated, react-native-safe-area-context, react-native-screens,
react-native-svg, react-native-view-shot, react-native-worklets, zustand
```

### Dev (4개)
```
@expo/ngrok, @types/react, eas-cli, patch-package, typescript
```

---

## 14. 분석 이벤트 정의 (Mixpanel)

```typescript
const AnalyticsEvents = {
  LOGIN, LOGOUT, SIGNUP_COMPLETE,
  EVENT_VIEWED, CHECKIN_SUCCESS, CHECKIN_FAILED,
  MISSION_STARTED, MISSION_COMPLETED, EVENT_COMPLETED,
  CHARACTER_CREATED, LEVEL_UP,
  JOURNAL_SHARED, CHAT_SENT,
  DAILY_REWARD_CLAIMED, UGC_EVENT_CREATED,
  TUTORIAL_COMPLETED, TUTORIAL_SKIPPED,
  TAB_VIEWED, SCREEN_VIEWED,
};
```

---

> [!TIP]
> 이 문서를 AI에게 전달하면 WhereHere 프로젝트의 전체 맥락을 즉시 파악하고, 코드베이스를 이해한 상태에서 작업을 시작할 수 있습니다. 새로운 AI 세션을 시작할 때 이 문서를 첫 번째 컨텍스트로 제공하세요.
