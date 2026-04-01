# WhereHere — 배포 준비 · 기능 격차 · 탭 재구성 · 에이전트 프롬프트

이 문서는 **현재 코드베이스 기준**으로 정리했습니다. 스토어 제출 전 **법률·정책 검토**는 별도로 하세요.

---

## 1. 현재 구현 수준 (요약)

| 영역 | 코드에 있는 것 | 한계 / 미흡 |
|------|----------------|-------------|
| **지도** | `ClusteredMapView`, 이벤트 마커, `UserLocationMarker`(권한·위치 있을 때), 친구 마커, `FriendLocation` RPC, 재센터 | `showsUserLocation={false}` — **시스템 블루닷 대신 커스텀 마커**. 위치 권한 거부 시 홍대 기본 영역. **길찾기·경로(Zenly 수준)** 없음. |
| **소셜** | `app/social.tsx` — 친구 요청, 크루, 위치 공유 토글, `friendLocation` 서비스 | **피드/타임라인 없음**. **카카오톡 친구 초대·딥링크** 없음. 크루 초대는 **코드 중심**. |
| **캐릭터 채팅** | `app/chat.tsx`, Edge `character-chat`, 일일 한도 | 키보드 UX **개선 적용됨**(KeyboardAvoiding, 스크롤). |
| **탐험 허브** | `quests` 등 탭에서 이벤트·미션 연결 | 시즌패스·일지·프리미엄·이벤트 제안은 **부분 구현 또는 스텁**일 수 있음 — 화면별 확인 필요. |
| **계정 삭제** | 가이드(Untitled-1) 요구 | **별도 Edge Function·설정 UI** 없으면 스토어 심사 리스크 — **구현 필요**. |

---

## 2. 제안: 하단 탭 4개 + 프로필 하위 정리

**목표 UX**

| 탭 | 역할 |
|----|------|
| **지도** | 이벤트 탐색, 내 위치·친구 위치(공유 시), 체크인 진입 |
| **소셜** | 친구·크루·(향후) 피드/초대 |
| **캐릭터** | AI 대화 (`/chat`을 탭 루트로 두거나 `(tabs)/character`에서 `router`로 연결) |
| **프로필** | 내 정보, **탐험(퀘스트 허브)**, **가방**, 설정, 시즌패스·일지·프리미엄·이벤트 제안은 **섹션/스택**으로 |

**현재 구조** (`app/(tabs)/_layout.tsx`): 탐험 · 지도(중앙) · 가방 · 프로필 + `explore`/`missions` 숨김.

**리팩터 시 작업**

1. `(tabs)/_layout.tsx`에서 탭 4개로 교체.  
2. 기존 `quests`·`inventory`는 **프로필**에서 `router.push` 또는 **프로필 스택** 하위 화면으로 이동.  
3. `chat`은 모달 유지 vs 탭 전용 중 선택. (탭으로 바꾸면 `Stack`에서 `chat` 모달 제거 검토.)

---

## 3. 카카오톡 초대 / 앱 링크

- **스토어 URL 미공개 상태**에서도 가능: **Expo 링크**(`https://expo.dev/...`) 또는 **내부 테스트 트랙 링크**로 “앱 받기” 안내.  
- **프로덕션 딥링크**(`wherehere://`, Universal Links)는 **도메인 + 스토어 앱 등록 후**가 안정적.  
- **정리:** 배포 전에도 **초대 메시지에 텍스트+웹 링크**는 가능. **Zenly 수준 원클릭·카카오 SDK**는 **카카오 개발자 앱·네이티브 설정** 추가 필요.

---

## 4. 스토어 배포 체크리스트 (가이드 반영)

### 공통

- [ ] `docs/store-submission/`의 **개인정보·약관 HTML** 호스팅 후 **HTTPS URL**  
- [ ] **계정 삭제** (설정 + 서버 삭제 또는 Edge Function)  
- [ ] 권한 문구 `app.json`과 실제 사용 일치  
- [ ] AI 생성 콘텐츠 표시(이벤트 서사·채팅 등)  
- [ ] `eas build --profile production` / `eas submit`

### Google Play

- [ ] 개발자 등록 $25, **클로즈드 테스트 12인·14일**(개인 정책 시)  
- [ ] 데이터 안전, 콘텐츠 등급, 1024×500 피처 그래픽

### Apple

- [ ] Apple Developer $99/년  
- [ ] App Review Notes: **테스트 계정**, 위치·플로우 설명  
- [ ] Privacy Nutrition Labels

---

## 5. 클로드 코드 / Cursor 에이전트용 — 단계별 프롬프트

한 번에 다 하지 말고 **순서대로** 실행하는 것을 권장합니다.

### Phase A — 배포 블로커 (필수)

```
WhereHere는 Expo/React Native + Supabase다. 다음을 구현해줘.

1) 계정 삭제: app/settings 또는 profile에 "계정 삭제" 추가. 확인 다이얼로그 후 Supabase Edge Function `delete-account` 호출. Edge Function은 service_role로 해당 user_id의 public 데이터 삭제 후 auth.admin.deleteUser. RLS·외래키 순서 주의. supabase/functions/delete-account/index.ts + config.toml + 배포 명령 주석.

2) app.json에 NSPhotoLibraryUsageDescription 등 미션·프로필 사진에 필요한 usageDescription이 누락되어 있으면 추가.

3) 설정 화면에서 개인정보처리방침·이용약관 URL을 expo-constants extra 또는 상수로 열기 (WebBrowser.openBrowserAsync).

코드는 기존 스타일·패턴에 맞추고, 불필요한 리팩터는 하지 마.
```

### Phase B — 탭 네비게이션 재구성

```
app/(tabs)/_layout.tsx를 수정해 하단 탭을 4개로: 지도, 소셜, 캐릭터(채팅), 프로필.
- 기존 탐험(quests)·가방(inventory)은 프로필 탭 화면에서 섹션 링크로 이동하거나 Stack으로 push.
- 기존 라우트 깨지지 않게 redirect 또는 동일 화면 경로 유지.
- 아이콘·접근성 라벨 한국어 유지.
```

### Phase C — 지도 UX (선택)

```
지도 탭에서 사용자가 "내 위치가 안 보인다"고 느끼지 않게:
- 위치 권한이 granted일 때 UserLocationMarker가 항상 보이도록 확인하고, 거부 시 GpsBanner 유지.
- (선택) "내 위치로" 버튼 옆에 짧은 도움말.
길찾기·경로(Zenly 수준)는 이번 단계에서는 구현하지 말고, 외부 지도 앱 연동(openURL)만 하려면 제안만.
```

### Phase D — 소셜·초대 (선택, 큰 작업)

```
카카오톡 공유로 크루 초대 링크 보내기:
- @react-native-kakao/share 또는 웹 공유 시트(Share.share)로 텍스트+URL.
- 딥링크(wherehere://join?crew=CODE)는 app.json scheme과 연결, 앱 미설치 시 스토어 URL은 eas.json 또는 상수로.
- 카카오톡 API로 친구 목록에서 직접 초대는 카카오 비즈앱·심사 필요 — 이번에는 "공유하기"만.
```

### Phase E — QA

```
스토어 제출 전: 실제 기기에서 로그인, 지도, 이벤트, 미션, 채팅, 소셜 토글, 크래시 없이 스모크 테스트. Sentry가 있다면 릴리스 빌드에서 한 번 확인.
```

---

## 6. 이번 세션에서 코드로 반영한 것

- **`app/chat.tsx`**: 키보드 올라올 때 목록 스크롤, `KeyboardAvoidingView` 오프셋·`FlatList` `flex:1`·`keyboardShouldPersistTaps` 등으로 입력창 가림 완화.  
- **`app/(tabs)/map.tsx`**: `MapView` 타입 import 누락 보완.

---

## 7. 참고

- 상세 스토어 절차: 사용자 제공 **Untitled-1 가이드** + `docs/store-submission/`  
- 실제 청구·배포 계정은 **Cursor/EAS/Apple/Google** 각각 대시보드에서 최종 확인
