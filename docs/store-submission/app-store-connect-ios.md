# WhereHere — App Store Connect (iOS) 제출 가이드

> **Apple Developer ($99/년)** 가입·결제·팀 초대는 [Apple Developer](https://developer.apple.com)에서 직접 진행해야 합니다. 아래는 **콘솔에 붙여넣을 문구**와 **개인정보 라벨** 기준입니다.

---

## 1. 앱 생성 전 확인

| 항목 | 값 |
|------|-----|
| 번들 ID | `com.wherehere.app` (`app.json`과 동일) |
| SKU | 예: `wherehere-ios-1` (임의의 고유 문자열) |
| 기본 언어 | 한국어 |

---

## 2. 메타데이터 (복사 출처)

**전체 텍스트**는 `docs/store-submission/app-store-metadata.md`의 **「iOS App Store」** 섹션을 그대로 App Store Connect에 붙여넣습니다.

- 앱 이름 · 부제목 · 프로모션 텍스트 · 설명 · 키워드  
- 개인정보처리방침 URL · 지원 URL(또는 `mailto:`)  
- 저작권: `© 2026 WhereHere`  

---

## 3. 빌드 (Build) — 무엇을 고르나요?

**제가 값을 “정해줄 수 없는” 이유:** 빌드 번호는 **당신이 `eas build` → `eas submit`으로 올린 IPA**가 App Store Connect에 들어온 뒤에만 목록에 뜹니다.

| 단계 | 할 일 |
|------|--------|
| 1 | 터미널에서 `eas submit --platform ios --latest` (또는 해당 빌드 지정)로 업로드 |
| 2 | App Store Connect에서 **처리 중(Processing)** → 완료될 때까지 대기 (보통 수 분~1시간) |
| 3 | 이 페이지의 **빌드 추가** → 방금 올린 빌드 선택 |

업로드 전이면 빌드 목록이 비어 있는 것이 정상입니다. **먼저 제출 파이프라인을 끝낸 뒤** 다시 들어와서 고릅니다.

---

## 4. App Review 정보 — 로그인·연락처 (무엇을 넣나요?)

WhereHere는 **이메일/비밀번호 입력란이 없고**, **카카오 로그인(Supabase OAuth)** 만 있습니다. 그래서 **Apple이 예시로 적어 두는 “Username / Password” 칸**에 넣을 값은 **당신이 만든 심사 전용 카카오 계정** 기준으로 직접 정해야 합니다.

### 4.1 심사 전에 본인이 할 일

1. **카카오 계정을 하나 정한다** (가능하면 **심사 전용** 새 계정 추천 — 본인 메인 계정과 분리).
2. 그 계정으로 **실제 기기에서 앱에 로그인**까지 성공하는지 확인한다.
3. 그 카카오 계정에 로그인할 때 쓰는 **이메일(또는 카카오 ID)** 과 **비밀번호**를 적어 둔다 — 이것이 심사관이 카카오 로그인 화면에서 입력할 수 있는 정보입니다.

### 4.2 App Store Connect 화면에 넣는 값

| 필드 | 넣는 내용 |
|------|-----------|
| **로그인 필요** | 로그인 없이는 핵심 기능을 못 쓴다면 **체크**. (로그인 화면의 **둘러보기**만으로 심사가 가능하다고 판단하면 체크 해제 후 아래 Notes에 “Guest preview” 안내 가능 — 다만 미션·진행 저장 등이 제한될 수 있음.) |
| **사용자 이름** | 심사용 카카오 계정의 **로그인 ID**(카카오에 이메일로 가입했다면 그 이메일 등, 심사관이 카카오 로그인 UI에 넣을 수 있는 식별자). |
| **암호** | 위 카카오 계정의 **비밀번호** (카카오 로그인 웹/앱에서 입력하는 그 비밀번호). |
| **연락처 (성·이름·전화·이메일)** | **본인 실제 연락처** — Apple 심사 중 문제 있을 때 연락할 담당자 (개발자 본인 정보). |
| **메모 (Notes)** | 아래 **영문 블록**을 붙여넣고, 대괄호 부분만 본인 값으로 바꿉니다. |

### Notes for Review — 카카오 전용 템플릿 (영문)

```
WhereHere uses Kakao OAuth only (no email/password fields in the app).

DEMO KAKAO ACCOUNT FOR REVIEW:
- Username field above = Kakao login ID (email or Kakao account identifier).
- Password field above = Password for that Kakao account (used on Kakao’s login screen when tapping “카카오로 시작하기”).

REVIEW STEPS:
1. On the login screen, tap the Kakao button. Complete Kakao sign-in in the browser / Kakao app when prompted.
2. Grant “While Using” location — the map shows nearby events. If denied, the app may fall back to a default Seoul area.
3. Browse missions/events from the map or tabs; open Character chat if needed.
4. Settings → Privacy Policy / Terms open in Safari.
5. Settings → Account deletion is at the bottom (confirm dialog + server call).

Background location and IAP are optional for this review path.

Support: [YOUR_SUPPORT_EMAIL]
```

---

## 5. 개인정보 영양 라벨 (Privacy Nutrition Labels)

App Store Connect → **App Privacy** → **Get Started** 후, 아래는 **코드·권한 기준**입니다. 실제 운영에서 수집하지 않으면 해당 항목을 끄세요.

### 데이터를 추적하여 광고에 사용합니까?

- **아니요** — 앱에 광고 SDK·ATT/IDFA 사용이 없습니다.

### 연결된 데이터 (Data linked to the user)

| 데이터 종류 | 수집 여부 | 용도 (예시) |
|-------------|-----------|-------------|
| **위치** → 정확한 위치 | 예 | 주변 이벤트 표시, 체크인 검증, (선택) 백그라운드 근처 알림 |
| **구매 항목** | 예 | 인앱 구매·구독 상태 (RevenueCat) |
| **연락처 정보** → 이메일 | 로그인 방식에 따름 | 계정(카카오/이메일 등으로 Supabase에 연결되는 경우) |
| **사용자 콘텐츠** → 사진 또는 비디오 | 예 | 프로필 사진, 포토 미션 |
| **진단** | 선택 | `EXPO_PUBLIC_SENTRY_DSN`이 프로덕션에 설정된 경우 크래시 로그(Sentry). 설정 안 하면 수집 안 함. |
| **사용 분석** | 선택 | `EXPO_PUBLIC_MIXPANEL_TOKEN`이 설정된 경우 이벤트·사용자 식별(Mixpanel). 미설정이면 수집 안 함. |
| **식별자** → 사용자 ID | 예 | 계정·게임 진행·RevenueCat 연동 |

각 항목에서 Apple이 묻는 **목적** 예: *앱 기능*, *분석*(Sentry를 분석으로 쓰는 경우만), *사용자에게 연결됨*.

### 추적하지 않는 데이터

- 위 항목을 **추적(Tracking)** 정의에 해당하지 않게 선언합니다. 광고 추적은 없습니다.

> **주의:** Sentry에서 `setUser`로 사용자 ID를 넘기면 진단이 사용자와 연결된 것으로 보고하는 것이 안전합니다.  
> RevenueCat·Supabase·위치는 일반적으로 **Linked to user**입니다.

---

## 6. 스크린샷 (App Store Connect)

상세 순서·촬영 팁은 **`docs/store-submission/screenshot-guide.md`** 를 따릅니다.

| 요구 | 내용 |
|------|------|
| **필수 해상도 예** | iPhone 6.9" — **1320 × 2868** px (15 Pro Max 등) |
| **장수** | 최소 **2장**, 최대 **10장** |
| **권장** | 가이드의 1~6번 순서(지도 → 미션 → 캐릭터 → 체크인 → 뱃지 → 온보딩) |

실제 PNG는 **실기기 또는 해당 해상도 시뮬레이터**에서 캡처해야 합니다. 저장소에 이미지 파일을 자동 생성할 수는 없습니다.

---

## 7. 암호화·수출 규정

`app.json` → `ITSAppUsesNonExemptEncryption`: **false**  
App Store Connect의 수출 규정 질문에서 **표준 암호화만 사용·면제** 등 기존 선택과 맞게 답합니다.

---

## 8. EAS 프로덕션 빌드·제출 (명령어)

프로젝트 루트에서:

```bash
eas login
eas build --profile production --platform ios
```

- **첫 iOS 빌드** 또는 **인증서 미설정** 시에는 `--non-interactive` 없이 위 명령을 **대화형 터미널**에서 실행하세요.  
  EAS가 Distribution Certificate·Provisioning Profile을 생성·저장하는 과정에 답해야 합니다.  
  오류: `Credentials are not set up. Run this command again in interactive mode.` → 동일.

제출까지 한 번에:

```bash
eas submit --platform ios --latest
```

- Apple 쪽 **App Store Connect API 키** 또는 **앱 전용 비밀번호**가 EAS에 연결되어 있어야 합니다.  
- 자격 증명만 확인할 때: `eas credentials`

---

## 9. 제출 전 체크리스트

- [ ] Notion 개인정보 URL이 시크릿 창에서 열림 (`app-store-metadata.md` URL)  
- [ ] 테스트 계정으로 로그인·지도·미션·설정(약관·삭제) 확인  
- [ ] 스크린샷 2장 이상 (1320×2868 등 필수 크기)  
- [ ] App Privacy 라벨이 실제 수집과 일치  
- [ ] `eas build --profile production --platform ios` 성공 후 빌드가 TestFlight/App Store에 업로드됨  
