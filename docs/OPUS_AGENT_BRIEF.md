# WhereHere — Opus 4.6 작업 브리핑
> 이 파일을 Opus 4.6 세션 시작 시 먼저 읽힐 것

---

## 프로젝트 개요
- **Expo / React Native** + **Supabase** (PostgreSQL + Edge Functions + Auth)
- 위치기반 탐험 보상 앱. 지도에서 이벤트 발견 → 체크인 → 보상 → AI캐릭터 성장
- 앱스킴: `wherehere://`, 번들ID: `com.wherehere.app`

## 현재 구조
```
app/
  (auth)/        — 로그인 화면
  (tabs)/
    _layout.tsx  — 현재 탭: 탐험·지도·가방·프로필 (4개, 구조 변경 필요)
    map.tsx      — 지도 (418줄)
    quests.tsx   — 탐험 허브
    inventory.tsx — 가방
    profile.tsx  — 프로필 (685줄)
    explore.tsx  — 숨김
    missions.tsx — 숨김
  chat.tsx       — AI캐릭터 채팅 (580줄, 탭 외 모달/라우트)
  social.tsx     — 소셜 (1280줄, 탭 외)
  settings/      — index.tsx, account.tsx, notifications.tsx, _layout.tsx
  character/     — 캐릭터 관련
  event/
  mission/
  reward/
  shop/

src/
  services/friendLocation.ts  — 위치 공유 서비스
  stores/characterStore.ts
  lib/api.ts
  config/theme.ts
  providers/ThemeProvider.tsx

supabase/functions/
  character-chat, complete-event, generate-events-batch, ...
  (delete-account 없음 — 새로 만들어야 함)
```

---

## 해야 할 작업 목록 (우선순위 순)

### ✅ Phase A — 배포 블로커 (스토어 심사 필수)

**A1. 계정 삭제 기능**
- `supabase/functions/delete-account/index.ts` 새로 생성
  - service_role 키로 해당 user_id의 public 데이터 삭제 후 `auth.admin.deleteUser`
  - RLS·외래키 의존 순서 주의 (profiles → events → etc.)
- `app/settings/account.tsx`에 "계정 삭제" 버튼 + 확인 다이얼로그 추가
- `supabase/config.toml`에 함수 등록

**A2. app.json 권한 보완**
- iOS `infoPlist`에 `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription` 추가 (현재 위치 권한만 있음)

**A3. 개인정보처리방침·이용약관 링크**
- `app/settings/index.tsx`에서 `WebBrowser.openBrowserAsync` 로 URL 열기
- URL은 `src/config/constants.ts` 또는 `app.json` extra에 상수로

---

### ✅ Phase B — 탭 네비게이션 재구성

**목표: 하단 탭 4개**
| 탭 | 파일 | 아이콘 |
|----|------|--------|
| 지도 | `(tabs)/map.tsx` (기존) | map |
| 소셜 | `social.tsx` → `(tabs)/social.tsx`로 이동 | people |
| 캐릭터 | `chat.tsx` → `(tabs)/character.tsx`로 이동 | chatbubbles |
| 프로필 | `(tabs)/profile.tsx` (기존) | person |

**작업:**
1. `app/(tabs)/_layout.tsx` 탭 4개로 교체
2. `social.tsx`를 `(tabs)/` 디렉토리로 이동 또는 탭에서 router.push로 연결
3. `chat.tsx`를 `(tabs)/character.tsx`로 이동 또는 탭에서 router.push로 연결
4. 기존 `quests`, `inventory` → 프로필 탭 내 섹션 링크로 이동
5. 숨김 처리 필요 탭: `explore`, `missions` (기존처럼 `href: null`)

**주의:**
- 기존 `router.push('/chat')`, `router.push('/social')` 호출 경로 깨지지 않게
- redirect 또는 경로 유지

---

### ✅ Phase C — 지도 UX 개선

**C1. 내 위치 항상 표시**
- `app/(tabs)/map.tsx`에서 위치 권한 granted 시 `UserLocationMarker`가 항상 렌더링되는지 확인
- 현재 `showsUserLocation={false}` — 커스텀 마커 방식 유지하되, 마커가 실제로 보이는지 검증
- 위치 권한 거부 시 GpsBanner 표시 (현재 구현 있는지 확인 후 없으면 추가)

**C2. 외부 지도 앱 연동 (길찾기)**
- 이벤트 상세에서 "길찾기" 버튼 → `Linking.openURL`로 카카오맵/네이버지도/구글맵 중 사용 가능한 앱으로 열기
- 직접 인앱 경로 구현은 이번 Phase에서 제외

---

### ✅ Phase D — 소셜 기능 강화

**D1. 키보드 채팅 UX 수정 (즉시 필요)**
- `app/chat.tsx` — 키보드가 올라올 때 메시지 목록이 밀리고 입력창이 항상 보여야 함
- 현재 문제: 키보드가 FlatList + 입력창을 덮음
- 해결책:
  ```tsx
  // KeyboardAvoidingView behavior 설정
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={insets.top + headerHeight}
  >
    <FlatList
      ref={flatListRef}
      style={{ flex: 1 }}
      data={messages}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
    />
    {/* 입력창 */}
  </KeyboardAvoidingView>
  ```

**D2. 크루 초대 — 카카오톡 공유 + 딥링크**
- `app/social.tsx` 크루 초대 코드 섹션에 `Share.share()` 추가
- 공유 텍스트: `"WhereHere 크루 [크루명]에 초대합니다!\n코드: CODE\n앱 다운로드: https://wherehere.app/join?crew=CODE"`
- 딥링크: `wherehere://join?crew=CODE` (scheme은 app.json에 이미 있음)
- 카카오 SDK 네이티브 연동은 비즈앱 심사 필요 — 이번에는 `Share.share` 시트로

**D3. 소셜 피드 (선택적 구현)**
- 친구들의 최근 체크인/탐험 활동 타임라인
- `social.tsx`에 `feed` 탭 추가 (friends | crew | feed)
- Supabase에서 `events` + `check_ins` 조인해서 친구 활동 조회
- 간단한 카드 형태로 표시

---

### ✅ Phase E — 배포 준비

**E1. Privacy Policy 페이지**
- `docs/store-submission/` 에 `privacy-policy.html` 생성
- GitHub Pages 또는 Vercel로 배포 가능한 단일 HTML

**E2. EAS 빌드 설정 확인**
- `eas.json`의 production 프로필 확인
- `eas build --platform all --profile production` 준비

**E3. 스토어 메타데이터**
- 앱 이름: "WhereHere - 현실 탐험 보상 앱"
- 짧은 설명: "지도 위 이벤트를 탐험하고, 보상을 모으고, 캐릭터를 성장시키세요"
- `docs/store-submission/app-store-metadata.md` 이미 있음 — 최신화 필요

---

## 핵심 파일 경로

| 파일 | 역할 |
|------|------|
| `app/(tabs)/_layout.tsx` | 하단 탭 정의 |
| `app/chat.tsx` | AI캐릭터 채팅 (키보드 버그 있음) |
| `app/social.tsx` | 소셜 전체 (친구/크루/위치공유) |
| `app/(tabs)/map.tsx` | 지도 |
| `app/(tabs)/profile.tsx` | 프로필 |
| `app/settings/account.tsx` | 계정 설정 (삭제 기능 추가 필요) |
| `src/services/friendLocation.ts` | 위치 공유 서비스 |
| `src/lib/api.ts` | API 함수 모음 |
| `supabase/functions/` | Edge Functions |
| `app.json` | 앱 설정, 권한, 딥링크 scheme |

---

## 권장 실행 순서

```
1. Phase A (배포 블로커) — 계정 삭제 + 권한 + 개인정보 링크
2. Phase D1 (채팅 키보드 UX) — 즉시 사용자 체감
3. Phase B (탭 재구성) — UI 골격 확정
4. Phase C (지도 UX)
5. Phase D2~D3 (소셜 강화)
6. Phase E (배포 준비)
```

---

## 시작 명령

새 세션에서 이 파일을 읽은 뒤:
```
이 브리핑 파일을 기반으로 Phase A부터 순서대로 구현해줘.
각 Phase 완료 후 다음으로 넘어가기 전에 변경 사항을 요약해줘.
코드는 기존 스타일과 패턴을 유지하고, 불필요한 리팩터는 하지 마.
```
