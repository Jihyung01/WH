---
name: kakao-integration
description: WhereHere의 카카오 OAuth 로그인, 카카오톡 공유, 카카오 친구 기능 작업 시 자동 로드. @react-native-kakao/* SDK의 알려진 함정(TurboModule SIGABRT, 플랫폼별 분기, OAuth redirect 처리)을 반영한다. 카카오 관련 코드 수정 시 반드시 이 skill 참조.
---

# 카카오 통합 Skill

## 언제 쓰는가
- `@react-native-kakao/core`, `/user`, `/share`, `/social` 관련 코드 작업
- 카카오 OAuth 로그인 흐름 수정 (`app/(auth)/login.tsx`)
- 카카오톡 공유 기능 (`src/services/kakaoShare.ts`)
- 카카오 친구 목록 가져오기 (`src/services/kakaoFriends.ts`)
- 카카오 SDK 초기화 (`src/services/kakaoCore.ts`)

## 🚨 최우선 경고

### 경고 1: `@react-native-kakao/share` TurboModule 크래시
- **실제 프로덕션에서 발생**: `SIGABRT via performVoidMethodInvocation`
- **조건**: New Architecture 활성 + TurboModule 경로 + void 메서드 invocation
- **현재 버전**: v2.4.x
- **대응**: 호출부 반드시 방어

```typescript
// ✅ 올바른 방어 패턴
import * as Sentry from '@sentry/react-native';
import { shareLink } from '@react-native-kakao/share';

export async function safeKakaoShare(options: ShareOptions) {
  try {
    await shareLink(options);
    return { success: true };
  } catch (error) {
    Sentry.captureException(error, { 
      tags: { module: 'kakao-share' },
      extra: { options }
    });
    // 대체 경로: expo-sharing으로 fallback
    return { success: false, error };
  }
}

// ❌ 절대 금지
await shareLink(options);  // try/catch 없음
```

### 경고 2: 플랫폼별 OAuth 경로 혼동
iOS와 Android가 **완전히 다른 흐름**을 탄다. 절대 통합하려 하지 말 것.

```typescript
// 현재 구조 (유지)
if (Platform.OS === 'android') {
  // 네이티브 OIDC 우선 → Supabase signInWithIdToken
  // Fallback: 웹 OAuth (openAuthSessionAsync)
} else if (Platform.OS === 'ios') {
  // 웹 OAuth만 사용 (openAuthSessionAsync)
  // iOS에서 네이티브 OIDC 쓰지 말 것 — Supabase가 제대로 처리 못함
}
```

### 경고 3: Expo Go에서 카카오 SDK 동작 안 함
- 카카오 SDK는 네이티브 코드 포함 → Expo Go에서 `TypeError: Cannot read property 'init' of null`
- **개발 중 테스트는 development build에서만**
- 에이전트가 "왜 안 되지?"라고 할 때 Expo Go로 테스트 중인지 확인

## 키 & 설정

### 환경변수 (env)
```
EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY=<네이티브 앱 키>
EXPO_PUBLIC_USE_KAKAO_NATIVE_AUTH=true  # Android 네이티브 OIDC 사용 여부
```

### `app.json` / `app.config.js`
- `@react-native-kakao/*` 네이티브 설정은 `app.config.js`에서 병합
- Android: Maven repo + URL scheme 등록
- iOS: URL scheme (`kakao<APP_KEY>`), LSApplicationQueriesSchemes

### Deep Link
- URL scheme: `wherehere://`
- 카카오 로그인 redirect: `wherehere://auth/callback`
- 크루 초대: `wherehere://join?code=XXX`

## Supabase 연동 (OAuth → Supabase 세션)

### Android 네이티브 OIDC 경로
```typescript
// 1. 카카오 네이티브 SDK로 id_token 획득
const token = await KakaoUser.loginWithKakaoAccount();
const { idToken } = token;

// 2. Supabase signInWithIdToken
const { data, error } = await supabase.auth.signInWithIdToken({
  provider: 'kakao',
  token: idToken,
});

// 3. 프로필 부트스트랩 (없으면 생성)
if (data.user) await ensureProfile(data.user.id);
```

### 웹 OAuth fallback (iOS + Android fallback)
```typescript
const { data } = await supabase.auth.signInWithOAuth({
  provider: 'kakao',
  options: {
    redirectTo: 'wherehere://auth/callback',
    skipBrowserRedirect: true,
  },
});

await WebBrowser.openAuthSessionAsync(
  data.url!,
  'wherehere://auth/callback'
);
```

## 카카오톡 공유 사용 패턴

### Feed 공유 (이벤트, 탐험 일지)
```typescript
import { shareFeedTemplate } from '@react-native-kakao/share';

await safeKakaoShare({
  templateId: YOUR_TEMPLATE_ID,
  templateArgs: {
    title: event.name,
    description: event.description,
    image_url: event.image_url,
    mobile_url: `https://wherehere.app/event/${event.id}`,
  },
});
```

### 커스텀 템플릿 vs 기본 템플릿
- 기본 Feed template 사용 권장 — 커스텀 템플릿은 카카오 디벨로퍼 콘솔 등록 필요
- 공유 테스트는 실제 디바이스에서만 (시뮬레이터에서 카카오톡 앱 없음)

## 친구 기능

### 현재 구현
- `src/services/kakaoFriends.ts`: 카카오 친구 목록 조회
- 카카오 친구 → WhereHere 가입자 매칭 후 친구 요청 전송
- **권한 필요**: `friends` scope — 로그인 시 명시적 요청

### 주의
- 카카오 친구 목록은 **양쪽이 서로 허용한 경우만** 반환됨
- 프로덕션 앱은 비즈 앱 등급 필요할 수 있음 — 현재 상태 확인 후 작업

## 로그아웃 & 세션 정리

**중요**: 로그아웃 시 카카오 SDK도 반드시 로그아웃 호출

```typescript
// src/stores/authStore.ts의 signOut()
async signOut() {
  await KakaoUser.logout();  // ← 누락하면 다음 로그인 시 이전 세션 남음
  await supabase.auth.signOut();
  await Purchases.logOut();  // RevenueCat
  await clearUserLocalCaches();
}
```

## 디버깅 체크리스트

카카오 관련 이슈 조사 시:

- [ ] Expo Go가 아닌 development build에서 테스트 중인가?
- [ ] `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY`가 env에 올바르게 설정됐나?
- [ ] `app.config.js`에 `@react-native-kakao/core` plugin 등록돼 있나?
- [ ] Android: Maven repo가 `build.gradle`에 추가됐나? (expo prebuild 필요)
- [ ] iOS: URL scheme이 `Info.plist`에 있나?
- [ ] 카카오 디벨로퍼 콘솔에서 플랫폼별 키 해시(Android), 번들 ID(iOS) 등록됐나?
- [ ] Redirect URL이 콘솔에 `wherehere://auth/callback`로 등록됐나?

## OTA 배포 가능 여부

- ✅ **OTA 가능**: 공유 템플릿 내용 변경, 방어 코드 추가, UI 문구, 에러 처리
- ❌ **Native 필요**: SDK 버전 업그레이드, 새 scope 추가, URL scheme 변경, `app.config.js` 변경

## 절대 하지 말 것

- ❌ `import { shareLink } ...` 직접 호출 (try/catch 없이)
- ❌ iOS에서 네이티브 OIDC 사용 시도
- ❌ `@react-native-kakao/*` 패키지 버전 임의 변경
- ❌ Expo Go에서 동작 안 한다고 package.json 수정 시도
- ❌ 카카오 앱 키를 코드에 하드코딩 (반드시 env)
- ❌ 로그아웃 시 `KakaoUser.logout()` 생략
