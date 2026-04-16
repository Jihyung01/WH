# AGENTS.md — WhereHere 프로젝트

> 이 파일은 Antigravity, Cursor, Claude Code 등 AGENTS.md 호환 에이전트가 자동으로 읽는 프로젝트 규약이다.
> 프로젝트 루트에 그대로 둔다. 에이전트는 매 작업 시작 시 이 파일 전체를 컨텍스트로 로드한다.
> 마지막 갱신: 2026-04-16

---

## 0. 절대 지켜야 할 규칙 (위반 시 즉시 중단)

1. **네이티브 모듈 추가·버전 변경 금지** — `package.json` 수정 전 반드시 사람에게 승인 요청. OTA 배포가 불가능해진다.
2. **Git remote가 없음** — `git push` 시도 금지. 로컬 커밋까지만 수행.
3. **새 Expo SDK 업그레이드 자동 실행 금지** — SDK 54 → 55 같은 메이저 업데이트는 의도적 작업일 때만.
4. **Supabase 마이그레이션 임의 실행 금지** — `supabase db push` / `supabase migration up` 절대 자동 실행 금지. SQL 파일만 작성하고 사람이 실행.
5. **환경변수·API 키를 코드에 하드코딩 금지** — `EXPO_PUBLIC_*` 이름으로 `.env`에서 읽는다.
6. **Mac/Xcode 없는 환경** — iOS 네이티브 코드(`ios/` 폴더) 수정은 EAS Build에서만 의미 있음. 로컬에서 빌드 시도 금지.

---

## 1. 프로젝트 개요

**앱명**: WhereHere (웨어히어)
**번들 ID**: `com.wherehere.app`
**한 줄 설명**: 서울 거주 MZ세대를 위한 위치 기반 탐험·체크인 RPG
**주 언어**: 한국어 (Korean-first)
**유저 지시자**: 이지형 (CEO, 개발자 겸 사업화 담당)

---

## 2. 기술 스택 (반드시 준수)

| 영역 | 기술 | 버전 |
|---|---|---|
| 프레임워크 | React Native + Expo | RN 0.81.5 / Expo SDK 54 |
| 언어 | TypeScript | 5.9 (strict) |
| 라우팅 | Expo Router | 6 (파일 기반) |
| 상태 | Zustand | 5 (persist middleware 사용) |
| 애니메이션 | Reanimated | 4.1 |
| 지도 | react-native-maps | 1.20.1 |
| 네이티브 아키텍처 | **New Architecture 활성** (`newArchEnabled: true`) |
| 엔진 | **Hermes** |
| 백엔드 | Supabase (PostgreSQL + PostGIS + Edge Functions Deno) |
| 결제 | RevenueCat |
| 인증 | Kakao OAuth, Apple Sign-In, Email/Password |
| 빌드 | EAS Build/Submit/Update |
| 크래시 | Sentry (DSN은 env) |
| 분석 | Mixpanel |

**개발 환경**: Windows. Mac/Xcode 없음. iOS 빌드는 **EAS Build 전용**.

---

## 3. 🚨 알려진 치명적 함정 (반복 실수 방지)

> 아래 함정들은 실제로 프로덕션 크래시를 일으킨 적이 있다. 관련 코드 수정 시 반드시 의식하고 작업할 것.

### 3.1 `react-native-mmkv` 쓰지 말 것
- **증상**: 지도 region 변경 시 SIGABRT 크래시 (Hermes + New Architecture)
- **해결**: Zustand persist storage는 `@react-native-async-storage/async-storage`만 사용
- **금지**: MMKV 재도입 제안도 거절. 대체 라이브러리로도 충분히 빠름
- **파일**: `src/stores/storage.ts`에 AsyncStorage 어댑터 패턴 정착됨

### 3.2 `@react-native-kakao/share` TurboModule 크래시
- **증상**: `SIGABRT via performVoidMethodInvocation` — 공유 호출 시점
- **원인**: New Architecture의 TurboModule 경로에서 void 메서드 invocation 실패
- **현재 상태**: v2.4.x 사용 중. 호출 전 방어 코드 필수
- **규칙**: 카카오 공유 호출부는 반드시 `try/catch` + Sentry capture. UI 레벨에서 실패 시 대체 공유 수단(expo-sharing) 제공

### 3.3 Zustand store의 setter에 업데이트 함수 전달 금지
- **증상**: Hermes segfault (앱 즉시 종료, 크래시 로그 없음)
- **사례**: `setVisibleEvents(prev => [...prev, newEvent])` → 즉사
- **규칙**: setter에는 **반드시 최종 값(배열/객체)** 전달. 업데이트 함수 형태 금지
- **방어**: store 내부에 `Array.isArray(next) ? next : []` 같은 타입 가드 둘 것

### 3.4 `expo-updates` JS/native 버전 불일치
- **증상**: OTA 업데이트 후 앱 실행 불가 또는 기능 무반응
- **원인**: JS 번들과 네이티브 코드의 runtime version mismatch
- **규칙**: `app.json`의 `runtimeVersion: { policy: "appVersion" }` 정책 준수. 네이티브 변경 시 반드시 `appVersion` bump 후 새 native build.

### 3.5 `@sentry/react-native` 플러그인 빌드 파이프라인
- **증상**: 여러 빌드에서 **JS 번들이 통째로 누락** (앱 실행 즉시 화이트스크린)
- **원인**: Sentry plugin이 빌드 파이프라인에서 silent failure
- **현재 방어**: `SENTRY_ALLOW_FAILURE=true` 환경변수로 우회 가능
- **규칙**: Sentry 설정 변경 시 반드시 TestFlight/Internal track에서 먼저 번들 무결성 확인

### 3.6 `expo-haptics` / Reanimated 조합 크래시 (조사 중)
- **증상**: "미션 완료하기" 버튼 탭 시 크래시 재현 중
- **현재 가설**: Reanimated worklet 내부에서 haptics 호출 또는 haptics 호출 타이밍
- **방어**: `src/utils/hapticsSafe.ts`의 래퍼 사용. 직접 `expo-haptics` import 금지

### 3.7 Expo Go에서 OAuth 동작 불가
- **증상**: 카카오/Apple 로그인이 Expo Go에서 실패
- **원인**: 네이티브 SDK 필요 (카카오, Apple 모두)
- **규칙**: OAuth 테스트는 **development build**에서만. 개발 중 Expo Go 사용 시 이메일/비밀번호 로그인 경로 유지.

---

## 4. 코드 스타일 & 컨벤션

### 4.1 TypeScript
- `any` 금지. 불명확 시 `unknown` + narrowing.
- DB 모델 타입은 `src/types/models.ts`, 열거형은 `src/types/enums.ts` 유지
- Supabase RPC 응답은 반드시 zod 또는 수동 narrow로 런타임 검증
- 컴포넌트 props는 interface 아닌 type alias 선호 (프로젝트 관행)

### 4.2 파일 구조 규칙
- `app/` = Expo Router 스크린만 (라우팅 단위)
- `src/components/[feature]/` = 재사용 컴포넌트 (feature별 서브폴더)
- `src/lib/api.ts` = **모든** Supabase RPC/Edge Function 호출의 단일 진입점 (1666줄 거대 파일이지만 이게 규약)
- `src/services/` = 외부 SDK 래퍼 (Kakao, HealthKit 등)
- `src/stores/` = Zustand 스토어 (feature별 분리)
- `src/hooks/` = 커스텀 훅 (use* prefix)

### 4.3 Import 순서
```typescript
// 1. React/React Native
// 2. 외부 라이브러리
// 3. Expo 모듈
// 4. 절대 경로 (@/ 또는 src/)
// 5. 상대 경로
// 6. 타입 imports (type-only)
```

### 4.4 스타일링
- StyleSheet는 컴포넌트 파일 하단에 `StyleSheet.create({})`
- 색상·간격은 **반드시** `src/config/theme.ts`에서 가져오기. 하드코딩 금지
- 다크/라이트 모드는 `useTheme()` 훅 사용

### 4.5 비동기 & 에러 처리
- 모든 async 함수는 try/catch. 실패 시 `errorReporting.ts` 유틸로 Sentry capture
- 사용자 보이는 에러는 한국어 메시지
- 네트워크 실패는 반드시 재시도 또는 오프라인 UI 제공

---

## 5. 브랜드 & 디자인 시스템

### 5.1 팔레트 (절대 변경 금지 없이 사용)
```
Primary:       #2DD4A8  (민트 그린)
Primary Dark:  #1AAD8A
Primary Light: #7EE8CA
Gold:          #FFB800
Purple:        #8B5CF6
Coral:         #FF6B6B

Dark BG:       #0F172A
Dark Surface:  #1E293B
Light BG:      #FAFBFC
Light Surface: #FFFFFF
```

### 5.2 타이포
- Primary: `Pretendard` (본문·UI)
- Narrative: `NotoSerifKR` (AI 내러티브, 일지)
- Mono: `SpaceMono` (수치·코드)

### 5.3 인터랙션
- Press scale: 0.97, 80ms
- Transition: 300ms
- Stagger (리스트 애니메이션): 60ms

---

## 6. Git 규약

### 6.1 브랜치 네이밍
- `fix/<issue>` — 버그 수정
- `feat/<feature>` — 신규 기능
- `refactor/<area>` — 리팩터링
- `design/<spec>` — 설계 문서 전용 (코드 변경 없음)
- `audit/<scope>` — 감사/조사 결과 문서

에이전트는 작업 시작 전 반드시 새 브랜치 생성:
```bash
git checkout -b fix/example-$(date +%Y%m%d)
```

### 6.2 커밋 메시지
- Conventional Commits: `type(scope): description`
- 타입: `feat`, `fix`, `refactor`, `docs`, `chore`, `perf`, `test`
- 한국어 OK. 무엇을 왜 바꿨는지 명확히
- 예: `fix(journal): 탐험 일지 생성 버튼 onClick 누락 수정`

### 6.3 커밋 빈도
- 파일 10개 또는 100줄 이상 변경 시 중간 커밋
- 작업 끝에 FIX_REPORT.md 또는 CHANGES.md 업데이트 후 최종 커밋

---

## 7. 테스트 & 검증

현재 **단위 테스트 없음**. 에이전트가 코드를 수정한 경우 다음 검증 단계를 반드시 실행:

```bash
# 1. 타입 체크 (필수)
npx tsc --noEmit

# 2. Lint (있다면)
npx eslint . --max-warnings 0

# 3. Metro 번들 드라이런 (선택, 시간 오래 걸림)
npx expo export --platform android --output-dir /tmp/export-check
```

**통과하지 않으면 커밋 금지.** 타입 에러 무시하고 진행 금지.

---

## 8. OTA vs 네이티브 판별 (매우 중요)

수정 전 반드시 자문: **"이 변경이 OTA로 배포 가능한가?"**

### 8.1 OTA로 배포 가능 (`eas update`로 즉시 배포)
- JS/TS 코드, React 컴포넌트, 스타일, 상수
- `src/` 폴더 내 모든 변경
- `app/` 폴더 내 스크린 변경 (기존 라우트 내에서)
- 이미지 에셋 (`assets/` 내 기존 이미지 교체)

### 8.2 네이티브 빌드 필요 (EAS Build 재실행 필요)
- `package.json` 의존성 추가/제거/업데이트
- `app.json` / `app.config.js`의 plugins, permissions, entitlements 변경
- 새 native module 추가 (`@react-native-*`, `react-native-*` 신규)
- iOS/Android 설정 파일 직접 수정
- Expo SDK 버전 업그레이드
- `runtimeVersion` 변경

### 8.3 에이전트 판단 플로우
변경이 네이티브 영역이면 → 사람에게 즉시 승인 요청 → 승인 시에만 진행.

---

## 9. Supabase 규약

### 9.1 RPC 호출
- 모든 호출은 `src/lib/api.ts`의 함수를 통해. 스크린에서 직접 `supabase.rpc()` 호출 금지
- 응답 타입은 반드시 명시: `invokeEdgeFunction<ResultType>(...)` 또는 `supabase.rpc<Return>('name', args)`

### 9.2 마이그레이션
- 파일명: `YYYYMMDDHHmmss_description.sql`
- **작성만 하고 실행은 사람이**. 자동 push 금지
- 기존 테이블 ALTER 시 반드시 기존 데이터 보전 전략 포함

### 9.3 RLS (Row Level Security)
- 새 테이블은 **반드시** RLS 정책 포함
- `auth.uid()` 기반 owner-only 정책이 기본
- 공개 조회가 필요한 경우 명시적으로 SELECT policy 추가

### 9.4 Edge Functions
- Deno 환경. `@supabase/supabase-js` 사용
- JWT verify_jwt 기본 활성화
- AI 호출(OpenAI/Gemini)은 Edge Function 내부에서만. 클라이언트에서 직접 호출 금지
- API 키는 Supabase secrets에서 읽기

---

## 10. 크래시·버그 조사 프로토콜

크래시 리포트를 받았을 때 에이전트는 다음 순서로 조사:

1. **Sentry 이벤트 확인** (DSN 있으면) — 스택 트레이스 + 사용자 action trail
2. **재현 조건 명시** — OS, 기기, 빌드 번호, 재현 절차
3. **위 섹션 3의 알려진 함정과 대조** — 같은 패턴인지 확인
4. **가설 → 최소 수정으로 검증** — 큰 리팩터링 자제
5. **OTA-safe 수정 우선** — 네이티브 쪽 문제라도 JS 레벨 방어로 우회 가능하면 그렇게

보고 형식:
```markdown
## 크래시: <제목>
- 영향 범위: <화면·기능>
- 재현 절차: 1. 2. 3.
- 원인 가설: ...
- 제안 수정: ... (OTA-safe | Native 필요)
- 리스크: ...
```

---

## 11. AI 기능 수정 시 주의사항

AI 관련 Edge Function (`character-chat`, `generate-narrative`, `generate-quiz`, `generate-journal`, `recommend-events`, `generate-ugc-event`, `generate-events-batch`, `generate-evolution-image`) 수정 시:

1. **system prompt 변경 시 반드시 before/after 비교** — 3개 이상 샘플 입력으로 출력 검증
2. **모델 변경 금지** — 현재 지정된 모델(예: gpt-4o, claude-3.5-sonnet) 유지. 변경 필요 시 사람에게 근거와 비용 영향 보고
3. **temperature/max_tokens 변경도 사람 승인** — 사용자 체감 품질에 직결
4. **토큰 사용량 로깅 추가** — 모든 AI 호출은 비용 추적 가능해야 함

---

## 12. 작업 완료 보고 포맷

모든 작업 종료 시 다음 형식으로 보고:

```markdown
## 작업: <제목>

### 변경 요약
- 수정 파일: <count>개
- 추가/삭제 라인: +X / -Y
- 작업 브랜치: <branch-name>

### OTA 배포 가능 여부
- [ ] OTA-safe (eas update로 배포 가능)
- [ ] 네이티브 빌드 필요 (이유: ...)

### 검증 결과
- 타입 체크: ✅ / ❌
- Lint: ✅ / ❌
- 수동 검증 체크리스트: ...

### 리스크·주의사항
- ...

### 다음 단계 제안
- ...
```

---

## 13. 이것만은 절대 하지 말 것 (Quick don'ts)

- ❌ MMKV 재도입 제안
- ❌ `git push` 자동 실행
- ❌ Supabase 마이그레이션 자동 실행
- ❌ `package.json` 자동 수정
- ❌ Expo SDK/RN 메이저 업그레이드 자동 실행
- ❌ iOS/Android 네이티브 폴더(`ios/`, `android/`) 직접 수정 시도
- ❌ API 키·DSN·토큰 하드코딩
- ❌ AI 모델 변경 (gpt-4o → gpt-5 같은 임의 변경)
- ❌ 에러 무시하고 진행 (타입/lint 실패 시 반드시 중단)
- ❌ `any` 타입으로 도망
- ❌ 사용자에게 영어로 UI 메시지 노출

---

## 14. 참고 문서

같은 폴더의 다음 문서를 상황에 따라 참조:
- `WHEREHERE_PROJECT_BLUEPRINT.md` — 전체 프로젝트 블루프린트 (844줄, 최신 아키텍처 상세)
- `.antigravity/skills/*/SKILL.md` — 특정 영역 작업 시 자동 로드되는 전문 지식
- `docs/AUTH_FLOW.md` 등 — 기존 기술 문서

Skills는 에이전트가 작업 내용을 보고 **자동으로** 관련 skill을 로드한다. 수동 참조 불필요.

---

> 이 규약에서 벗어나야 할 특별한 이유가 있다면 실행 전에 반드시 사용자에게 근거와 함께 질문할 것.
> 불확실하면 멈추고 물어본다. 추측으로 진행하지 않는다.
