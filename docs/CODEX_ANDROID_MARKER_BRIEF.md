# Codex 프롬프트 — WhereHere Android 지도 마커 깨짐/잘림 전수 진단

> 이 문서를 통째로 Codex 채팅창에 붙여넣고 시작하면 됩니다. 이미 시도된 것
> 들과 제약, 검증 절차가 다 들어 있어 Codex 가 자급자족적으로 수정 가능.

---

## 너에게 부여된 역할

너는 React Native 0.81 + Expo SDK 54 + react-native-maps 환경에서 Android
GoogleMap 의 custom Marker 비트맵 캡처 동작을 깊이 이해하고 있는 시니어 RN
엔지니어다. 이 프로젝트의 Android 지도 마커가 **여러 차례 패치에도 불구하고
계속 깨지거나 잘려서 표시**되고 있다. 너의 일은 이 회귀를 **근본 원인부터**
짚어 한 번에 끝내는 것이다.

추측으로 또 한 번 패치를 던지지 마라. **코드 전체를 읽고**, RN/expo/
react-native-maps 가 Android 에서 Marker 를 비트맵으로 만드는 정확한 메커
니즘과 우리 코드의 view tree 가 그 메커니즘과 어디서 충돌하는지를 글로 먼
저 설명한 뒤 수정해라.

---

## 시스템 개요

- **앱**: WhereHere (위치 기반 탐험 모바일 앱). `app.json` 의 `version` 은
  `1.2.0`, `runtimeVersion.policy: "appVersion"`. EAS channel `production`.
- **스택**: Expo 54 / RN 0.81.5 / TypeScript / Expo Router v6 / Zustand /
  react-native-maps + react-native-map-clustering / react-native-svg /
  react-native-reanimated v4 / @gorhom/bottom-sheet / expo-image.
- **배포 상태**: iOS 는 App Store v1.1.0 배포 완료, Android 는 내부 테스트.
  새 네이티브 패키지 설치 / `app.json` 변경 / Production build 는 절대 금지.
  **모든 수정은 OTA(`eas update --channel production`) 로 나갈 수 있어야 함.**
- **루트 규칙**: `/CLAUDE.md` 와 `/.cursorrules`, `/AGENTS.md` 에 명시된
  하네스 규칙을 모두 따른다 (any 금지, console.log 남기지 마라, TODO 추가
  금지, 기존 탭/인증 플로우 변경 금지, 코드 한국어 + 영문 혼용 금지).

---

## 사용자가 보고 있는 증상

- 단말: **Samsung Galaxy Z Flip** (Android 14, Samsung One UI). 고DPI.
- 지도(`app/(tabs)/map.tsx`) 진입 시 이벤트 마커(퀘스트, 탐험 등)가 **동그란
  원으로 안 나오고 잘리거나 일부만 보임**. 사용자는 "원래는 동그랗게 제대
  로 나왔어, iOS 에서도 제대로 나오는데 안드로이드만 문제"라고 함.
- 동일 빌드의 iPhone 에서는 마커가 정상(Ionicons + 펄스 링 + 화살표 + 태그
  까지) 표시됨.
- 위치(분당 정자 일대), 카테고리(자연/탐험 등) 와 무관하게 재현.

---

## 사용자가 가진 가설 (검증되지 않음)

> "react-native-maps 에서 안드로이드는 GoogleMap 으로 나오는 것 같은데
> 픽셀이 iOS 랑 다른 거 아니야?"

가능성 있는 가설:
1. Android 의 marker bitmap 캡처 캔버스가 view 의 `measuredWidth/Height`
   기반이라 dp ↔ px 라운딩 오차로 박스 밖 픽셀이 잘림.
2. `react-native-svg` 가 일부 OEM(One UI) 에서 TextureView/SurfaceView 로
   렌더되어 GoogleMap marker bitmap 에 합성 안 됨.
3. `react-native-reanimated` worklet 이 marker bitmap commit 과 경합 → 반쪽
   비트맵.
4. emoji/Ionicons 폰트 글리프가 비트맵 캡처 시점에 로드 안 돼 있음.
5. `tracksViewChanges` 가 너무 일찍 false 로 떨어져 깨진 비트맵이 박힘.
6. `position: absolute` 자식이 top/left 없으면 OEM 에 따라 (0,0) 으로
   fallback.
7. `marginTop: -1` 같은 음수 margin 이 OEM 에 따라 measure 단계에서 무시됨.

위 가설을 **하나씩 코드 + react-native-maps 의 실제 Android 네이티브 구현
(`AirMapMarker.java` / `AirMapMarkerManager.java`)** 으로 검증해라. 추측만
으로 패치 던지지 마라.

---

## 그동안 시도된 (그리고 실패한) 패치들

git log 의 최근 마커 관련 커밋 (최신 → 과거):

```
8589ac8 fix(android): GoogleMap marker bitmap 측정 라운딩 잘림 — 컨테이너 버퍼 + 음수 margin 제거
e54980e fix(android): 동작했던 9d77a82 마커 레이아웃 그대로 복원
72756ec changes
1b1f377 fix(android): Samsung One UI(Z Flip) 마커 비트맵에 SVG도 누락 → 순수 View 로 재작성
fcd83fb fix(android): 마커 비트맵에 이모지 텍스트 합성 누락 → SVG path 아이콘으로 통합
2401f81 chore: production OTA env 적용 및 마커 수정 반영
ed6da04 fix: Android 이벤트 마커 잘림 수정
a46c461 fix(android): EventMarker — Ionicons 폰트 → emoji 로 교체해 마커 깨짐 해결
bc4aebf fix(android): event marker icon clipping
9d77a82 fix(android): stable map markers — no Reanimated in bitmap, cluster single disc  ← 이 시점은 동작했었다고 함
651f86f fix(android): 지도 마커 잘림 및 Google Fit 연동 UX 개선
50a5700 fix: HealthKit direct NativeModules, ..., Android marker clipping
```

이미 시도되고 효과 없거나 회귀를 만든 접근:
- ❌ Ionicons → emoji 교체 (a46c461) — 다른 단말에선 효과, Z Flip 엔 영향 없음
- ❌ react-native-svg path 로 통합 (fcd83fb) — Z Flip 에서 SVG 자체 누락
- ❌ 순수 View + ASCII 글리프로 재작성 (1b1f377) — 여전히 잘림
- ❌ 9d77a82 레이아웃 복원 (e54980e) — 여전히 잘림
- ❌ 컨테이너 width/height 버퍼 + 음수 margin 제거 (8589ac8) — 여전히 잘림

따라서 **단순히 마커 컴포넌트 안의 layout 만 만지는 패치로는 안 될 가능성이
높다**. 다음 영역까지 같이 봐라:
- Marker 부모 (`ClusteredMapView`/`MapView`) props
- `removeClippedSubviews`, `provider`, `tracksViewChanges` 의 인터랙션
- `react-native-maps` / `react-native-map-clustering` 의 Android 마커
  처리
- 사용자 로컬 단말의 OTA 채널/runtimeVersion 매치 여부

---

## 반드시 봐야 하는 파일

### 1차 (마커 컴포넌트)
- `src/components/map/EventMarker.tsx` — 이벤트 마커
- `src/components/map/UserLocationMarker.tsx` — 본인 위치 마커
- `src/components/map/FriendMarker.tsx` — 친구 마커
- `src/components/map/MapClusterMarker.tsx` — 클러스터 마커
- `src/components/mark/MarkMarker.tsx` — UGC 마크 마커

### 2차 (사용처 & MapView 설정)
- `app/(tabs)/map.tsx` — `ClusteredMapView` props (`removeClippedSubviews`,
  `provider`, `clusteringEnabled`, `extent`, `animationEnabled` 등)
- `src/components/character/CharacterAvatar.tsx` — UserLocationMarker 안쪽
  에서 씀

### 3차 (의존성)
- `package.json` 의 `react-native-maps`, `react-native-map-clustering`,
  `react-native-svg`, `react-native-reanimated`, `expo`, `react-native`
  버전 확인. 알려진 Android marker bitmap 버그가 그 버전대에 있는지
  changelog 확인.
- `app.json` 의 `version` / `runtimeVersion.policy` / `updates.url` /
  `android.permissions`

### 4차 (네이티브 동작 조사)
- `node_modules/react-native-maps/android/src/main/java/com/airbnb/android/react/maps/AirMapMarker.java`
- `node_modules/react-native-maps/android/src/main/java/com/airbnb/android/react/maps/AirMapMarkerManager.java`
- 거기서 `createDrawableFromView` / `getBitmapDescriptorByName` /
  `tracksViewChanges` 처리 흐름을 읽고 우리 view tree 가 어디서 잘리는지
  특정해라.

### 5차 (참고)
- `/CLAUDE.md` — 프로젝트 하네스 (네이티브 변경 금지 규칙 등)
- `docs/OPUS_AGENT_BRIEF.md` 가 있으면 같이 읽어라.

---

## 작업 순서 (반드시 이 순서로)

### Step 1. 진단 (코드를 안 고치기 전 단계)

1. 위 `1차 ~ 4차` 파일을 다 읽는다. 코드 구조를 머릿속에 그려라.
2. `react-native-maps` 의 Android Marker 가 view 를 비트맵으로 만드는
   정확한 시점/메커니즘을 한 문단으로 요약해라 (몇몇 OSS 이슈
   #2658, #4537, #4541, #4592 같은 marker clipping/Bitmap 이슈도 검색해서
   참고). 인용 한 두 줄만, 직접 본 거.
3. 우리 `EventMarker.tsx` 의 view tree 를 보고 **dp 좌표로 박스 좌표를
   직접 계산**해라 (container, markerBody, pulseRing, bubble, arrow, tag).
   각 자식이 컨테이너 밖으로 빠지는지/marker bitmap 캔버스 안에 들어가는지
   숫자로 적어라.
4. `tracksViewChanges` 의 라이프사이클을 추적해라 — 언제 true→false 가
   되며, 그 시점에 view tree 가 정확히 무엇을 그리고 있는지.
5. `app/(tabs)/map.tsx` 에서 `ClusteredMapView` 에 어떤 props 가 가는지,
   `react-native-map-clustering` 이 superCluster 로 마커 하위
   `<Marker>` 를 다시 만드는지, 그게 우리 `EventMarker.tsx` 에 어떻게 영향
   주는지 추적해라.
6. **위 6단계를 마친 뒤**, 진단 보고서 (≤ 25줄) 를 출력해라. 이 보고서가
   "이 한 줄이 잘림의 원인" 까지 짚지 못하면 다음 단계로 가지 마라.

### Step 2. 수정

진단에서 짚은 단 하나의 근본 원인을 고친다. 패치는 가능한 한 좁게.
복수 가설이 있으면 가장 가능성 높은 한 가지부터 고친 뒤, 차후 가설이 남는다
면 별 commit 으로 분리.

수정 후 다음을 자동 검증:

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "components/map" || echo "OK: 마커 관련 타입 에러 없음"
```

### Step 3. 시각 검증 가이드 (사용자에게 출력)

사용자가 단말에서 바로 검증할 수 있도록:
- 어떤 단말 → 어떤 동작 (OTA 받기 / 앱 강제 종료 후 재기동) → 어떤 화면 →
  어떤 마커가 어떻게 보여야 정상인지를 5줄로.
- iPhone 에서 회귀가 없는지도 명시.

---

## 절대 제약 (위반 시 패치 무효)

1. **iOS 분기는 한 글자도 변경하지 마라.** iOS 는 정상 동작 중. iOS 가
   영향받는 커밋은 즉시 revert.
2. **새 네이티브 패키지 설치 금지** (`expo install`, `npm install` 어떤
   네이티브 모듈도 추가 금지).
3. `app.json` / iOS Info.plist / Android Manifest 변경 금지.
4. 기존 탭 구조 / 인증 플로우 / 기존 API 시그니처 변경 금지.
5. console.log / TODO / FIXME 새로 추가 금지.
6. 모든 변경은 **OTA 가능 범위 안에서**. 빌드가 필요한 변경이라면 절대
   금지하고, 그 사실을 사용자에게 보고만.
7. 기존 컴포넌트를 새로 만들지 말고 기존 파일을 수정/확장해라.
8. 한국어 문자열에 영어 혼용하지 마라.

---

## 인풋 자산

작업 전에 사용자에게 다음을 요청해도 됨 (하지만 보고서 안에서 정확히 명시):
- Z Flip 단말의 React Native version, Android OS version, GMS version
- 단말에 설치된 native APK 의 `versionName` (앱 정보 → 버전)
- 단말에 다운로드된 OTA bundle 의 `runtimeVersion` (Sentry 또는 Mixpanel
  로그가 있으면 거기서)

---

## 산출물

### 1. 진단 보고서 (≤ 25줄)

```
[근본 원인 한 줄]
[정확히 어떤 파일, 어떤 라인이 문제인지]
[react-native-maps 의 Android Marker 가 어떤 동작을 하기 때문에 그렇게 되는지]
[검증한 가설 / 기각된 가설 목록]
```

### 2. 수정 diff (가능한 한 좁게)

- 변경된 파일 / 라인 / 한 줄짜리 변경 사유 표 형태로.

### 3. 사용자 검증 가이드 (≤ 8줄)

- Z Flip 에서: 어떻게 OTA 받고 무엇을 확인하면 되는지
- iPhone 에서: 회귀 없는지 어떻게 확인하는지
- 만약 그래도 안 되면 다음 단계로 무엇을 해보면 되는지

### 4. (필요시) 다음 가설 큐 (≤ 5줄)

이번 패치로도 안 풀렸을 때 시도해볼 다음 가설을 우선순위 순으로.

---

## 출력 마무리에 반드시 다음 형식

```
## 작업 완료 요약

### 변경된 파일
- path/to/file.tsx — 한 줄 설명

### 새로 생성된 파일
- (없으면 "없음")

### 배포 방법
- [x] OTA 배포 가능 (JS 변경만)
- [ ] Edge Function / DB 마이그레이션 / Production 빌드 필요 여부

### OTA 명령어
eas update --channel production --message "변경 설명"

### 수동 테스트 체크리스트
1. ...
2. ...
```
