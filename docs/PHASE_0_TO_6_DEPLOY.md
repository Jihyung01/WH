# Phase 0 / 1 / 2 / 6 — 단말 검증 deploy 가이드

이번 작업으로 manga 톤이 **글로벌 토큰 + 탭바 + 지도 + 프로필** 4개 영역에 적용됐습니다. 본인이 단말에서 검증할 수 있게 commit + push + DB push + OTA 순서대로 정리.

---

## 1. 변경 요약

### Phase 0 — 디자인 토큰 + 폰트 (§0.1)
- `src/config/theme.ts` — `MANGA`, `MANGA_AVATAR_PALETTE`, `MANGA_SHADOW`, `MANGA_BORDER`, `MANGA_RADIUS` 토큰. `FONT_FAMILY` 에 Pretendard 3 variant + BagelFatOne
- `assets/fonts/` — Pretendard-Regular/SemiBold/Bold + BagelFatOne-Regular
- `app/_layout.tsx` — useFonts 4개 추가 + MangaToastHost 글로벌 마운트

### Phase 1 — 글로벌 UI primitives (§0.2)
- `src/components/ui/MangaAvatar.tsx` — 한글 이니셜 + 자동 색
- `src/components/ui/InkCard.tsx` — Android-safe hard ink shadow 카드
- `src/components/ui/InkButton.tsx` — 도장 누르기 효과 버튼
- `src/components/ui/MangaChip.tsx` — 7가지 톤 칩
- `src/components/ui/MangaToast.tsx` — 종이 칩 토스트 + 호스트
- `src/components/ui/MangaTabBar.tsx` — 5탭 만화 탭바
- `app/(tabs)/_layout.tsx` — **5탭 (지도/피드/소셜/메시지/프로필)** + MangaTabBar. 캐릭터 탭은 `href: null` 로 숨김 (라우트는 살아있음)
- `app/(tabs)/messages.tsx` — Phase 5 placeholder

### Phase 2 — 지도 manga 톤 (§1)
- `src/components/map/mapStyle.ts` — `MANGA_MAP_STYLE` paper 톤 추가
- `src/components/map/MapSearchBar.tsx` — "오늘 어디로?!" + 알림 종
- `src/components/map/MapWeatherChip.tsx` — 좌상단 날씨 chip
- `src/components/map/MapFabStack.tsx` — 우측 4 FAB (레이어/이벤트/흔적/내위치)
- `src/components/map/NearbyPlacesCarousel.tsx` — 하단 근처 탐험지 가로스크롤
- `src/components/map/PowEffect.tsx` — 만화 효과음 오버레이
- `app/(tabs)/map.tsx` — 위 컴포넌트들 통합. avatarBtn 제거. 기존 마커는 PNG 그대로 (Z Flip 회귀 방지)

### Phase 6 — 프로필 manga 재구성 (§5)
- `supabase/migrations/20260508030329_manga_place_memories_diaries.sql` — `place_memories` / `diaries` / `diary_likes` / `diary_comments` 테이블 + RLS + RPC 7종 + Storage 버킷 2개
- `src/lib/api.ts` — Phase 6 API 함수 9개 (`listMyPlaceMemories`, `createPlaceMemory`, `listMyDiaries`, `createDiary`, `updateDiaryVisibility`, `toggleDiaryLike`, `getExploreSummary`)
- `src/components/profile/MangaProfileSections.tsx` — 5 섹션 (PlaceMemorySection, DiarySection, ExploreSummarySection, AINoteSection, ExploreHubSection)
- `app/(tabs)/profile.tsx` — manga 톤 7 섹션 재구성 (헤더 / 캐릭터 미니카드 / 메모리 / 일기장 / 통계 / AI 노트 / 허브 / 설정 / 로그아웃). **캐릭터 화면 진입은 허브의 첫 타일**.
- `app/diary/create.tsx` (신규) — 일기 작성 화면 MVP
- `app/memory/create.tsx` (신규) — 메모리 작성 화면 MVP

### iOS 보존 ✅
- 기존 `BRAND` / `DARK_PALETTE` / `LIGHT_PALETTE` / `COLORS` / `SHADOWS` / `BORDER_RADIUS` 한 줄도 미변경
- 기존 마커 4종 (EventMarker / UserLocationMarker / FriendMarker / MapClusterMarker) 한 글자도 안 건드림
- 캐릭터 / 시즌 / 일지 / 프리미엄 / 채팅 / 친구 / 이벤트 화면 본문 그대로

---

## 2. 단말에서 deploy 순서 (한 번에 끝내기)

```bash
cd ~/Projects/WH

# 0) Cowork 가 못 지운 git lock 정리
rm -f .git/index.lock 2>/dev/null

# 1) git status 확인
git status --short

# 2) 변경 add
git add src/config/theme.ts \
        app/_layout.tsx \
        "app/(tabs)/_layout.tsx" \
        "app/(tabs)/map.tsx" \
        "app/(tabs)/profile.tsx" \
        "app/(tabs)/messages.tsx" \
        app/diary/ \
        app/memory/ \
        src/components/ui/ \
        src/components/map/ \
        src/components/profile/ \
        src/lib/api.ts \
        supabase/migrations/20260508030329_manga_place_memories_diaries.sql \
        assets/fonts/ \
        docs/

# 3) 루트에 떨어진 stray 파일 정리 (이전 시도 잔여물)
rm -f Pretendard-Regular.otf Pretendard-SemiBold.otf Pretendard-Bold.otf download

# 4) phase 별 commit (한 번에 묶어도 OK):
git commit -m "feat(spec): manga 디자인 phase 0+1+2+6 일괄 적용

Phase 0 (§0.1) — manga 디자인 토큰 + 폰트:
- theme.ts 에 MANGA / MANGA_AVATAR_PALETTE / MANGA_SHADOW / MANGA_BORDER /
  MANGA_RADIUS 추가. FONT_FAMILY 에 Pretendard 3 variant + BagelFatOne.
- app/_layout.tsx useFonts 에 Pretendard + BagelFatOne 등록 + MangaToastHost
  글로벌 마운트.
- assets/fonts/ 에 ttf/otf 4개.

Phase 1 (§0.2) — 글로벌 UI primitives:
- src/components/ui/: MangaAvatar / InkCard / InkButton / MangaChip /
  MangaToast / MangaTabBar 신규.
- app/(tabs)/_layout.tsx: 5탭 (지도/피드/소셜/메시지/프로필) + MangaTabBar.
  캐릭터 탭은 href:null (라우트 보존, 탭바 제외).
- app/(tabs)/messages.tsx: Phase 5 placeholder.

Phase 2 (§1) — 지도 manga 톤:
- mapStyle.ts: MANGA_MAP_STYLE paper 톤 JSON 추가.
- 신규 컴포넌트: MapSearchBar / MapWeatherChip / MapFabStack /
  NearbyPlacesCarousel / PowEffect.
- map.tsx: 상단(검색+종+날씨), 우측 FAB 스택, 하단 carousel 통합.
  avatarBtn 제거. 기존 PNG 마커는 그대로 보존 (Z Flip 회귀 방지).

Phase 6 (§5) — 프로필 manga 재구성:
- 마이그레이션 20260508030329: place_memories / diaries / diary_likes /
  diary_comments 테이블 + RLS + 7개 RPC + Storage 버킷 2개
  (place-memories, diary-photos).
- api.ts: 9개 helper (listMyPlaceMemories / createPlaceMemory /
  listMyDiaries / createDiary / updateDiaryVisibility / toggleDiaryLike /
  getExploreSummary).
- src/components/profile/MangaProfileSections.tsx: 5 섹션.
- profile.tsx: manga 톤 7 섹션 (헤더 / 캐릭터 미니카드 / 메모리 / 일기장 /
  통계 / AI 노트 / 허브 / 설정). 캐릭터 진입은 허브 첫 타일.
- app/diary/create.tsx, app/memory/create.tsx: MVP 작성 화면.

iOS 보존: BRAND/COLORS/마커 4종/캐릭터/시즌/일지/프리미엄 화면 미변경.
OTA: 가능. 새 native 모듈 0, app.json 미변경. 새 폰트 ttf 4개는 JS 번들 포함.

다음: Phase 3 (피드) / Phase 4 (소셜) / Phase 5 (메시지) / Phase 8 (설정)."

git push origin main

# 5) DB 마이그레이션 push (Supabase)
npx supabase db diff   # (선택) 어떤 변경이 들어가는지 확인
npx supabase db push    # production 적용

# 6) OTA 배포
npx eas update --channel production --message "spec phase 0+1+2+6: manga 디자인"
```

---

## 3. 단말에서 검증 체크리스트

OTA 받은 뒤 (앱 강제 종료 → 재실행 → 자동 업데이트 → 한번 더 재실행):

### 폰트
- [ ] 헤드라인 글자가 둥글둥글한 BagelFatOne 으로 보임
- [ ] 본문이 Pretendard 로 살짝 더 또렷해짐

### 탭바
- [ ] 5탭: 지도 / 피드 / 소셜 / **메시지** / 프로필
- [ ] 캐릭터 탭이 사라지고 메시지 탭이 그 자리
- [ ] 종이 톤 배경 + 잉크 외곽선 2.5px
- [ ] 활성 탭: 노란 pill 아이콘 + 빨간 라벨 + 살짝 위로 떠있음
- [ ] 탭 누를 때 햅틱

### 지도 화면
- [ ] 지도 색이 종이 톤 (베이지/크림) 으로 바뀜
- [ ] 도로가 모래색, 강이 옅은 청록, 공원이 옅은 녹색
- [ ] 상단 검색바: "오늘 어디로?!" + 잉크 외곽선 + hard shadow
- [ ] 우측 알림 종: 파란 원 (미확인 있으면 빨간 도트)
- [ ] 좌상단 작은 날씨 chip (☀ 맑음, ☁ 흐림, ❄ 눈 등)
- [ ] 우측 FAB 4개 세로 스택 (레이어/이벤트/흔적/내위치 — 노란/빨간 강조)
- [ ] 하단 "근처 탐험지 N" 가로 스크롤 카드
- [ ] 마커는 기존 PNG 그대로 (이번엔 manga 톤 마커는 일부러 안 바꿈 — Z Flip 회귀 방지)

### 메시지 탭
- [ ] "메:시지" 헤드라인 (큰 BagelFatOne)
- [ ] "메시지 기능은 다음 업데이트에서 들어와요" placeholder
- [ ] 5 manga chip (그룹 채팅 / 1:1 DM / 단체 영상 / 위치 공유 / 번개 약속)

### 프로필 탭
- [ ] "나의 탐험" 큰 헤드라인
- [ ] 우상단 파란 설정 톱니
- [ ] 캐릭터 미니 카드 (Lv.X + XP 진행바 + 이름 + 화살표)
- [ ] 캐릭터 카드 누르면 기존 캐릭터 화면 진입
- [ ] 장소 메모리 섹션: "+ 새 메모리" 폴라로이드 + 기존 메모리 (DB 비어있으면 + 폴라로이드만)
- [ ] 새 메모리 누르면 작성 화면 (MVP — 제목 + 이모지 + 저장)
- [ ] 탐험 일기장 섹션: "+ 새 일기" 빨간 버튼 + 기존 일기 카드 (날짜 스탬프 + 본문 + 칩렛)
- [ ] 새 일기 누르면 작성 화면 (제목 + 본문 + 장소 + 공개범위 + 저장)
- [ ] 탐험 요약 4 KPI (탐험 장소 / 도시 / 기록 / 수집품)
- [ ] AI 탐험 노트 (노란 카드 + 로봇 아이콘)
- [ ] 탐험 허브 6 타일 (캐릭터/시즌/일지/프리미엄/친구/UGC) — **캐릭터 타일이 첫번째 자리, 노란 배경**
- [ ] 캐릭터 타일 누르면 기존 캐릭터 화면 진입 ✅ (이게 user 가 요청한 핵심)
- [ ] 설정 4 행 (알림 / 위치 / MBTI / 앱버전 1.2.0)
- [ ] 로그아웃 빨간 글자 버튼

### iOS 회귀 0
- [ ] 지도 마커 (이벤트/사용자/친구) 정상
- [ ] 캐릭터 화면 (드레스업 룸) 진입 정상
- [ ] 시즌 / 일지 / 프리미엄 / 친구 / 이벤트 생성 화면 정상

### 일기 / 메모리 작성 흐름 (DB 마이그레이션 push 후만 동작)
- [ ] 새 일기 작성 후 저장 → 토스트 "일기 저장됨" → 프로필 일기장에 새 카드 표시
- [ ] 새 메모리 작성 후 저장 → 토스트 "메모리 저장됨" → 프로필 메모리에 새 폴라로이드 표시

---

## 4. 다음에 이어서 작업할 phase

- **Phase 3** — 피드(explore.tsx) manga 톤 카드 재작성, 추천/팔로잉 세그먼트
- **Phase 4** — 소셜 탭: 스토리(stories 테이블 + 24h 만료 + Realtime) / 레이더 / 만나기·같이가기 / 크루 카드 / 챌린지 / 알림
- **Phase 5** — 메시지 탭 본문: chat_rooms / messages 테이블 + Realtime + 채팅방 UI + LIVE 단체영상 배너
- **Phase 7 확장** — 일기/메모리에 사진 업로드 + 친구 멘션 + 흔적 만들기 트레이스 화면
- **Phase 8** — 설정 sub-routes (알림 카테고리 / 차단 / 계정 / 데이터 / 약관)

이번 deploy 검증이 OK 면 다음 phase 들어가도록 알려주세요.

---

## 5. 알려진 한계 (Phase 6 의 미해결)

1. **장소 메모리 / 일기에 사진 업로드 미구현** — Phase 7.5 에서 expo-image-picker + Supabase Storage 직접 업로드 추가. 현재는 텍스트만 저장.
2. **AI 탐험 노트 placeholder** — 정적 텍스트. Phase 6.5 에서 Edge Function `generate-exploration-note` 구현하면 매주 자동 갱신.
3. **탐험 그래프(주/월/연 막대) 미구현** — Spec §5.5. 데이터가 충분히 쌓인 후 별도 phase 에서 add.
4. **함께한 친구 멘션 미구현** — Phase 6 의 일기에 `with_friends` 필드는 있지만 작성 시 친구 picker 없음. Phase 7 에서 추가.
5. **레벨 50 / 레벨 100 cap 등 진화 정보 미반영** — 캐릭터 미니카드의 XP 계산은 `(level + 1) * 500` 으로 단순화. 실제 게임 밸런스에 맞춰 추후 조정.

---

## 변경 이력

- v1 (2026-05-08): 첫 릴리스. Phase 0 / 1 / 2 / 6 deploy 가이드.
