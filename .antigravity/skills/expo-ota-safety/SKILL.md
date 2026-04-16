---
name: expo-ota-safety
description: WhereHere에서 수정 사항이 Expo OTA(eas update)로 배포 가능한지, 네이티브 빌드(eas build)가 필요한지 판별할 때 자동 로드. Mac/Xcode 없는 Windows 환경에서 Mac 빌드 서버(EAS) 의존도가 크기 때문에 OTA 여부가 배포 속도와 직결된다. 파일 수정 전 반드시 이 판별 기준을 적용한다.
---

# Expo OTA 배포 안전성 Skill

## 왜 중요한가
- **WhereHere는 Windows에서 개발 + Mac 없음** → iOS 네이티브 빌드는 EAS Build 서버에서만 가능
- EAS Build는 iOS 1회 20~40분 소요 + 무료 빌드 크레딧 제한
- **OTA 업데이트는 5분 이내, 무제한** → 작은 수정은 무조건 OTA가 이득
- 네이티브 변경 실수로 빌드 크레딧 낭비 방지

## 판별 플로우 (매 수정 전)

```
수정 대상 파일이…
├── src/ 내부? ────────────── ✅ OTA 가능
├── app/ 내부? ────────────── ✅ OTA 가능 (기존 라우트 내)
├── assets/ (이미지)? ───────── ✅ OTA 가능
├── package.json? ──────────── ❌ 네이티브 필요
├── app.json / app.config.js?
│   ├── plugins/permissions? ─ ❌ 네이티브 필요
│   └── 단순 메타데이터만? ──── ⚠️ runtimeVersion 따라 다름
├── ios/ 또는 android/? ────── ❌ 네이티브 필요 (애초에 수정 금지)
├── patches/? ───────────────── ❌ 네이티브 필요 (patch-package 재적용)
└── eas.json? ────────────────── ❌ 빌드 설정은 OTA와 무관
```

## ✅ OTA로 안전하게 배포 가능한 변경

### JS/TS 코드
- `src/` 내 모든 파일 (services, stores, lib, utils, components, hooks, config, types, providers, data)
- `app/` 내 스크린 파일 (기존 라우트 추가·수정)
- 새 라우트 추가 (`app/new-screen.tsx` 생성) — 단, 반드시 `_layout.tsx`에 등록

### 스타일·UI
- `theme.ts` 팔레트 조정
- StyleSheet 변경
- 새 컴포넌트 추가
- 애니메이션 조정
- 다크모드 로직 수정

### 비즈니스 로직
- Zustand store 로직 수정
- API 호출 로직 (`src/lib/api.ts`)
- RPC 호출 래퍼 추가
- Supabase 클라이언트 설정 조정

### 이미지 & 정적 에셋
- `assets/` 내 이미지 파일 교체 (동일 파일명 사용 시)
- JSON/정적 데이터 파일 변경 (`src/data/`)

### AI 프롬프트
- Edge Function 내 system prompt 변경 (Edge Function 재배포는 `supabase functions deploy` — 클라이언트 입장에서는 OTA 무관)

## ❌ 네이티브 빌드 필수 변경

### 의존성
- `package.json`의 `dependencies` 또는 `devDependencies` 추가·제거·버전 변경
- **예외**: patch-package로 JS 레이어만 패치하는 경우도 재빌드 필수 (prebuild 단계 필요)

### 네이티브 설정
- `app.config.js` / `app.json`의:
  - `plugins` 배열 변경
  - `ios.infoPlist` 변경 (권한 문자열, URL scheme 등)
  - `android.permissions` 변경
  - `ios.entitlements` 변경
  - `ios.config.usesNonExemptEncryption` 등 빌드 시 주입되는 설정
- 새 네이티브 모듈 추가

### Expo 자체
- Expo SDK 버전 업그레이드 (54 → 55)
- React Native 버전 변경
- `newArchEnabled` 토글
- Hermes ↔ JSC 전환

### 런타임 버전
- `runtimeVersion` 정책 변경 (`appVersion` → `sdkVersion` 등)
- `runtimeVersion` 고정값 변경

## ⚠️ 회색지대 — 주의 필요

### `app.json`의 일부 필드
- `version`, `ios.buildNumber`, `android.versionCode` 변경은 다음 빌드에만 반영 (OTA 무관)
- `name`, `slug`, `icon`, `splash` → 새 빌드 필요
- `updates.url`, `extra` → OTA로 전파됨 (runtime에서 읽음)

### EAS Update 메타데이터
- OTA 업데이트 메시지, 채널 이동 → OTA 가능
- Runtime version이 맞지 않으면 업데이트 거부됨

### 번들 리소스
- 새 폰트 파일 추가 → `app.json`에 등록하려면 네이티브 재빌드
- 폰트가 이미 등록된 경우 실제 파일 교체만은 OTA 가능 (거의 없음)

## 작업 플로우

### Step 1: 판별 후 사용자 확인
네이티브 변경이 포함되면 **작업 시작 전** 사용자에게 확인:
```
⚠️ 이 변경은 네이티브 빌드가 필요합니다.
- 이유: [구체적 설명]
- 영향: EAS Build 재실행 필요 (iOS ~30분, Android ~15분)
- 대안: [가능하면 OTA-safe 우회 방법 제시]
진행할까요?
```

### Step 2: 커밋 시 명시
커밋 메시지에 네이티브 영향 표시:
```
feat(auth): 새 OAuth provider 추가

[NATIVE BUILD REQUIRED] app.config.js의 plugins 변경
```

### Step 3: 배포 지시
- OTA-safe: `eas update --branch production --message "..."`
- Native: `eas build --platform all --profile production` 후 `eas submit`

## OTA-safe 우회 기법

네이티브 변경 없이 해결 가능한 흔한 케이스:

### 1. 새 권한 필요처럼 보이는 경우
- 이미 선언된 권한을 **처음 사용**하는 것은 OTA 가능
- 예: 백그라운드 위치 권한은 이미 `app.json`에 있으므로, 새 기능에서 사용해도 OTA OK

### 2. 새 딥링크 경로
- URL scheme(`wherehere://`)이 이미 등록되어 있으므로 새 경로(`wherehere://new-path`)는 OTA 가능
- 단, 새 scheme(`wh://`) 추가는 네이티브 필요

### 3. 조건부 네이티브 모듈 사용
- 이미 설치된 모듈을 **새 조건에서** 호출하는 건 OTA 가능
- 예: `expo-camera`를 이미 AR에서 쓰는데, 새 기능에서도 쓰는 건 OK

### 4. 새 이미지·아이콘
- `assets/` 내 기존 파일 교체는 OTA 가능
- 새 이미지 파일 추가도 OTA 가능 (JS에서 `require()`만 사용)

## WhereHere 특수 사항

### 1. Git Remote 없음
- 배포 후 `git push` 할 곳 없음. 로컬 커밋 + EAS 배포만.
- CI/CD 없음. 모든 배포는 사람 수동.

### 2. Sentry 주의
- `@sentry/react-native` plugin은 네이티브 레벨
- Sentry DSN 변경·활성화는 OTA 가능 (env 기반)
- Sentry source map 업로드 설정 변경은 네이티브 빌드 필요

### 3. Runtime Version 전략
- 현재: `runtimeVersion: { policy: "appVersion" }`
- `app.json`의 `version`이 같으면 OTA 호환
- 네이티브 변경 → `version` bump → 새 빌드 → 이전 버전은 OTA 업데이트 못 받음 (의도된 동작)

### 4. 번들 ID / Package
- `com.wherehere.app` 고정. 절대 변경 금지.
- 변경 시 App Store / Play Store 새 앱으로 등록 필요 → 전체 유저 재설치

## 체크리스트

변경 사항 분석 후:
- [ ] OTA-safe인지 판별 완료
- [ ] 네이티브 필요 시 사용자에게 승인 요청했는가
- [ ] 네이티브 필요 시 우회 방법 검토했는가
- [ ] 커밋 메시지에 `[NATIVE BUILD REQUIRED]` 표시 (해당 시)
- [ ] `runtimeVersion` 영향 여부 확인

## 배포 명령 참고

```bash
# OTA 업데이트 (production 채널)
eas update --branch production --message "fix: 탐험 일지 버튼 수정"

# 네이티브 빌드 (production 프로필)
eas build --platform ios --profile production
eas build --platform android --profile production

# Android 스토어 제출
eas submit --platform android --latest

# iOS TestFlight 제출
eas submit --platform ios --latest
```

**에이전트는 이 명령들을 자동 실행 금지**. 사용자가 직접 실행.
