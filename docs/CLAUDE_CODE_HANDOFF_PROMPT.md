# Claude Code 핸드오프 프롬프트 — WhereHere Manga Spec 구현

이 문서는 두 부분으로 구성됩니다:

1. **Claude Code 에 그대로 붙여넣을 풀 프롬프트** (한 번에 복사)
2. **본인이 외부에서 직접 해야 할 작업** (Supabase / API / 단말 OTA)

---

## Part 1 — Claude Code 에 붙여넣을 프롬프트

> 사용법: Claude Design 에서 `Share` → `Handoff to Claude Code...` 누른 직후 터미널에 Claude Code 세션이 열리면 아래 블록 전체를 붙여넣으세요. 시작 줄(`Fetch this design file...`)은 Claude Design 이 자동으로 넣어주는 부분이라 함께 들어갑니다.

````
다음 spec 파일을 읽고 그 안의 모든 항목을 React Native + Expo 프로젝트에 구현해라.

SPEC 위치 (URL 아니라 로컬 파일 — Claude Design 의 https://api.anthropic.com/v1/design/h/...
URL 은 공개 GET endpoint 가 아니라서 fetch 하지 마라. 무조건 로컬 파일 읽어라):

  ~/Projects/WH/docs/WhereHere_Spec.md

============================================================
PROJECT CONTEXT (반드시 먼저 읽고 시작)
============================================================

프로젝트 루트: ~/Projects/WH
스택: Expo SDK 54 / React Native 0.81.5 / TypeScript / Expo Router v6 /
      Zustand v5 / react-native-maps + react-native-map-clustering /
      react-native-svg / react-native-reanimated v4 / @gorhom/bottom-sheet v5 /
      expo-image / expo-camera / expo-location / expo-notifications /
      Supabase (PostgreSQL+PostGIS / Auth / Storage / Edge Functions / Realtime) /
      Anthropic Claude API (Edge Functions 안에서)

작업 시작 전 반드시 다음 파일들을 다 읽어 현재 상태 파악:
  /CLAUDE.md          ← 하네스 절대 규칙 (이게 최우선)
  /AGENTS.md          ← 추가 규칙 (있을 시)
  /package.json       ← 설치된 모듈 (이 목록에 없는 native module 추가 절대 금지)
  /app.json           ← runtimeVersion / version / 권한 (절대 변경 금지)
  /eas.json           ← OTA 채널 설정 (production)
  /src/config/theme.ts
  /src/lib/api.ts
  /src/types/enums.ts
  /src/types/models.ts
  /src/components/map/   (모든 파일)
  /src/components/character/CharacterAvatar.tsx
  /app/(tabs)/_layout.tsx
  /app/(tabs)/map.tsx
  /app/(tabs)/social.tsx
  /app/(tabs)/feed.tsx
  /app/(tabs)/character/index.tsx (있으면)
  /app/(tabs)/profile/index.tsx (있으면)
  /supabase/migrations/   (전체 — 23개 SQL 파일 시간순)
  /supabase/functions/    (11개 Edge Function 디렉터리)
  /docs/CODEX_ANDROID_MARKER_BRIEF.md  ← Z Flip 마커 회귀 컨텍스트
  /docs/CHARACTER_IMAGE_PROMPTS.md     ← 캐릭터 일러스트 16종 프롬프트

============================================================
ABSOLUTE CONSTRAINTS (위반시 작업 무효 처리)
============================================================

1. iOS 코드 절대 변경 금지. 마커 4종 EventMarker, UserLocationMarker, FriendMarker, MapClusterMarker 의 iOS 분기는 한 줄도 손대지 말 것. iOS 는 현재 정상 작동 중이고 깨지면 즉시 user-facing 회귀.

2. 새 native 모듈 추가 절대 금지.
   - 다음 작업은 모두 이미 설치된 모듈로 해결 가능하니 추가하지 마라:
     * 지도: spec 의 Leaflet 은 react-native-maps 의 UrlTile 로 치환
       (OSM 타일을 UrlTile 로 띄우고 paper tone 은 customMapStyle 로 처리)
     * 카메라: 이미 expo-camera + expo-image-picker 설치됨
     * 실시간: 이미 @supabase/supabase-js Realtime 사용 중 (friend locations)
     * 푸시: 이미 expo-notifications 설치됨
     * 폰트: 이미 expo-font 설치됨
   - "이건 native 가 더 좋은데..." 같은 판단 하지 마라. 무조건 OTA 가능 범위.

3. app.json / iOS Info.plist / AndroidManifest 변경 금지.
   - runtimeVersion 정책 그대로 (appVersion → 1.2.0)
   - 권한 strings 그대로 (이미 location/camera/notifications 다 있음)

4. 기존 탭 구조 변경 금지: map / feed / social / character / profile + 부가화면

5. console.log / TODO / FIXME 새로 추가하지 마라.

6. 한국어 문자열에 영어 섞지 마라.

7. 작업 단위마다 typecheck:
   `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "<your touched file>"`
   에러 0 이어야 다음 단계로 넘어갈 수 있다.

============================================================
HARNESS-ALLOWED EXPANSIONS (CLAUDE.md 의 OTA 정의 안에 들어감)
============================================================

다음은 다 OTA 가능하니 자유롭게 진행해라:

✅ 새 SQL 마이그레이션 추가 — supabase/migrations/{timestamp}_*.sql
✅ 새 Edge Function 추가 — supabase/functions/{kebab-name}/index.ts
✅ 새 RPC 함수 추가 — migrations 안에서 CREATE OR REPLACE FUNCTION
✅ 새 Storage 버킷 — migrations 의 storage.buckets insert 또는 사용자 manual
✅ 새 화면 라우트 추가 — app/ 하위에 파일 생성
✅ 새 컴포넌트 / hooks / services / stores
✅ 새 한글 폰트 ttf 파일 — assets/fonts/ 에 추가 + expo-font useFonts
✅ Anthropic Claude API 호출 (Edge Function 안에서, ANTHROPIC_API_KEY secret)
✅ 외부 API (OpenWeather 등) — Edge Function 안에서 호출, secret 으로 키 관리

============================================================
SPEC IMPLEMENTATION ORDER
============================================================

Phase 0 — 디자인 토큰 + 폰트 (가장 먼저, 모든 화면 기반)
─────────────────────────────────────────────────────────
  파일: src/config/theme.ts
  - manga 톤 토큰 추가 (CLAUDE.md 의 기존 light/dark 모드 구조 보존하면서):
    --ink   #1A1612
    --paper #FFFAEB
    --r     #FF4757
    --y     #FFD93D
    --g     #3DDC97
    --b     #4FBDFF
    --p     #C5A6FF
  - 잉크 외곽선 helper: borderInk = { borderWidth: 2.5, borderColor: '#1A1612' }
  - hard shadow helper: shadowInk = { shadowColor: '#1A1612', shadowOffset: { w:4, h:4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 0 }
    (RN shadow 는 iOS 만. Android 는 동일 효과 위해 absolute view 한 장 더 깔거나 SVG offset rect)
  - 라운드: cardRadius = 11~16, chipRadius = 5~8
  - typography: bodyFamily = 'Pretendard', displayFamily = 'BagelFatOne'

  폰트:
  - assets/fonts/Pretendard-Regular.otf, Pretendard-SemiBold.otf, Pretendard-Bold.otf
  - assets/fonts/BagelFatOne-Regular.ttf
  - app/_layout.tsx 에서 useFonts 로 로드 (이미 패턴 있을 것)
  - 사용자에게 폰트 파일 다운로드 위치 안내:
    * Pretendard: https://github.com/orioncactus/pretendard/releases (OFL 무료 상업)
    * Bagel Fat One: Google Fonts (OFL 무료)

Phase 1 — 글로벌 컴포넌트 (Toast / BottomTabBar / Avatar / Pressed Button)
─────────────────────────────────────────────────────────
  파일:
    src/components/ui/Toast.tsx (신규) — 종이 칩 + 별 아이콘, 2.4초
    src/components/ui/InkButton.tsx (신규) — 만화 hard-shadow + active translate(2,2)
    src/components/ui/Avatar.tsx (신규 또는 수정) — 한글 첫 글자 + 컬러 자동
    src/components/ui/Chip.tsx (신규)
    app/(tabs)/_layout.tsx — 탭바를 manga 톤으로 (잉크 외곽선 + 종이 배경)

  Z Flip 마커 회귀 컨텍스트:
  - Marker 안의 view 는 SVG/그림자/음수margin 다 OEM 비트맵 캡처 약함
  - 그래서 마커는 무조건 plain View + borderRadius + 단색 + bold ASCII glyph
  - 이건 docs/CODEX_ANDROID_MARKER_BRIEF.md 참조

Phase 2 — 지도 탭 (가장 큰 변경, OSM 타일 도입)
─────────────────────────────────────────────────────────
  핵심 치환: Leaflet → react-native-maps + <UrlTile />

  파일:
    src/components/map/mapStyle.ts — paper tone customMapStyle JSON 추가
    app/(tabs)/map.tsx — UrlTile 추가, 검색바, 날씨 chip, FAB stack 등
    src/components/map/EventMarker.tsx (Android 분기만)
    src/components/map/UserLocationMarker.tsx (Android 분기만)
    src/components/map/FriendMarker.tsx (Android 분기만)
    src/components/map/MapClusterMarker.tsx (Android 분기만)
    src/components/map/FogOfWar.tsx (신규) — Polygon with hole
    src/components/map/PowEffect.tsx (신규) — Reanimated 만화 효과음 SVG

  새 화면:
    app/trace/create.tsx (신규) — 흔적 만들기
    app/event/create.tsx (이미 있을 가능성 — spec 에 맞춰 확장)
    app/place/[id].tsx (있으면 확장, 없으면 신규)

  날씨 위젯:
    src/services/weather.ts — 이미 있음. OpenWeather 호출 부분이 클라이언트면
    Edge Function 으로 옮기는 게 안전 (API 키 노출 회피)
    supabase/functions/weather-current/index.ts (신규) — 위치 받아 OpenWeather 호출

  포그 오브 워:
  - 사용자 이전 시도에서 fog blur 가 깨졌음 (BLURRED HAZE 아님!)
  - 대신 Polygon mask 방식 사용:
    * 화면 viewport 전체를 덮는 큰 Polygon (반투명 잉크 #1A161270)
    * 그 Polygon 의 holes 배열에 visited area Circle 들의 좌표 시퀀스 넣음
    * react-native-maps Polygon 의 holes prop 지원
  - visited_areas 테이블 (사용자별 방문 좌표 grid 단위로 저장)

  POW 효과:
  - 새 장소 발견 시 (POI 도달) Reanimated 로 화면 중앙에 SVG splash
  - 1.6초 fadeIn → fadeOut, scale 1 → 1.3
  - 사운드는 일단 보류

Phase 3 — 피드 탭
─────────────────────────────────────────────────────────
  파일:
    app/(tabs)/feed.tsx — 추천/팔로잉 세그먼트 추가
    src/components/feed/FeedCard.tsx (신규 또는 기존 확장) — 만화 톤
    src/components/feed/CommentSheet.tsx (신규) — @gorhom/bottom-sheet
    src/components/feed/SaveButton.tsx (신규) — bookmark 토글

  DB:
    supabase/migrations/{ts}_saved_posts.sql — saved_posts 테이블 + RPC
      CREATE TABLE saved_posts (user_id UUID, submission_id UUID, saved_at TIMESTAMPTZ,
                                PRIMARY KEY (user_id, submission_id));
      RLS, RPC: toggle_save_post, get_saved_posts

  RPC 추가 (없으면):
    get_recommended_feed (사용자별 알고리즘) — 일단 단순 sort by likes_count desc
    get_following_feed
    report_submission, hide_submission

Phase 4 — 소셜 탭 (가장 큰 신규 영역)
─────────────────────────────────────────────────────────
  파일:
    app/(tabs)/social.tsx — 새 레이아웃 (스토리/레이더/세그먼트/리스트/크루/챌린지/알림)
    src/components/social/StoryRing.tsx (신규)
    src/components/social/StoryViewer.tsx (신규) — 풀스크린 시트
    src/components/social/Radar.tsx (신규) — 4 동심원 + 친구 핀
    src/components/social/MeetupButton.tsx (신규) — 번개 ⚡
    src/components/social/CompanionButton.tsx (신규) — 같이가기 🚶

  DB 신규 테이블:
    stories (id, user_id, media_url, expires_at, created_at)
    story_views (user_id, story_id, viewed_at)
    meetup_proposals (id, host_id, target_id, place_id?, proposed_time, status, created_at)
    companion_requests (id, requester_id, target_id, status, expires_at, created_at)

  Storage 버킷 신규:
    stories (Public, 5MB, image/jpeg+png+webp)

  Edge Function 신규:
    supabase/functions/cleanup-expired-stories/index.ts
    pg_cron 으로 매시간 호출 (마이그레이션에 cron job 등록)

  RPC 신규:
    create_story (media_url, expires_in_hours default 24)
    get_friend_stories (limit 50)
    mark_story_viewed
    propose_meetup (target_id, place_id, proposed_time) → 푸시 발송
    request_companion (target_id) → 푸시 발송
    accept_companion (request_id) → 1시간 위치 공유 ON
    end_companion (request_id)

Phase 5 — 캐릭터 탭 (드레스업 + 룩북 + 도감)
─────────────────────────────────────────────────────────
  ⚠️ Spec 의 6 슬롯 (모자/얼굴/상의/가방/신발/펫) vs 현재 코드 5 슬롯
     (hat/outfit/accessory/background/aura) 충돌.

  결정 (사용자 컨펌 후): 다음 둘 중 하나
    A) Spec 슬롯으로 마이그레이션:
       - character_loadout 컬럼 변경
       - 기존 cosmetics 데이터 매핑 (outfit→top, accessory→bag, background→pet, aura→face)
       - 마이그레이션 SQL 작성
    B) 현재 5 슬롯 유지 (background 만 살짝 살림)

    👉 A 권장 — spec 그대로 가는 게 정합성 ↑

  파일:
    app/(tabs)/character/index.tsx — 드레스업 룸 레이아웃
    src/components/character/StageView.tsx (신규)
    src/components/character/SlotPicker.tsx (신규) — 슬롯 탭 시 인벤토리 시트
    src/components/character/Lookbook.tsx (신규)
    src/components/character/CollectionGrid.tsx (신규) — 도감 (47/120)

  DB 신규:
    lookbooks (id, user_id, name, slots JSONB, cover_image_url, public, created_at)

  RPC 신규:
    save_lookbook
    list_my_lookbooks
    share_lookbook (피드에 자동 게시)
    get_collection_progress (owned / total per category)

Phase 6 — 프로필 탭 (장소 메모리 + 일기장 + AI 노트 + 허브)
─────────────────────────────────────────────────────────
  파일:
    app/(tabs)/profile/index.tsx — spec 7 섹션 레이아웃
    src/components/profile/PlaceMemoryCarousel.tsx (신규)
    src/components/profile/DiaryFeed.tsx (신규)
    src/components/profile/StatsBlock.tsx (신규)
    src/components/profile/ExploreGraph.tsx (신규) — Victory? Reanimated 직접?
    src/components/profile/AINoteCard.tsx (신규)
    app/diary/create.tsx (신규)
    app/diary/[id].tsx (신규)
    app/memory/create.tsx (신규)

  DB 신규:
    place_memories (id, user_id, place_id, photo_url, emoji, title, date, with_friends UUID[], created_at)
    diaries (id, user_id, title, body, place_id, with_friends UUID[],
             visibility ENUM 'public'|'friends'|'private',
             likes_count, comments_count, created_at)
    diary_likes (diary_id, user_id, liked_at)
    diary_comments (id, diary_id, user_id, body, created_at)

  Storage 버킷 신규:
    place-memories (Public, 8MB, image/jpeg+png+webp)
    diary-photos (Public, 8MB, image/jpeg+png+webp)

  RLS:
    diaries: visibility 'private' → 본인만, 'friends' → 친구 관계 있는 사용자, 'public' → 전체
    (이미 friend 관계 테이블 있으니 EXISTS subquery)

  Edge Function 신규:
    supabase/functions/generate-exploration-note/index.ts
      입력: user_id, recent activity (지난 30일 카테고리/시간대 분포)
      출력: "당신은 [취향]을 좋아해요. 최근 [카테고리]를 자주 찾았어요."
      Anthropic Claude (claude-sonnet-4-20250514) 호출
      결과는 ai_exploration_notes 테이블에 7일 캐시

  RPC 신규:
    get_user_stats_v2 (탐험 장소/도시/기록/수집품 카운트)
    get_explore_graph (period: week|month|year, 각 bucket 별 활동량)

Phase 7 — 메시지 (Messages, 별도 화면)
─────────────────────────────────────────────────────────
  파일:
    app/messages/index.tsx (신규) — 1:1 / 크루 채팅 목록
    app/messages/[room_id].tsx (신규) — 채팅방
    src/components/messages/MessageBubble.tsx
    src/components/messages/LocationShareBubble.tsx (지도 미니뷰)
    src/components/messages/EventInviteBubble.tsx (참여/거절 버튼)
    src/services/realtime.ts (확장 — 채팅 채널)

  DB 신규:
    chat_rooms (id, type ENUM '1on1'|'crew', crew_id?, created_at, last_message_at)
    chat_room_members (room_id, user_id, joined_at, last_read_at)
    messages (id, room_id, sender_id, content TEXT?, message_type ENUM 'text'|'location'|'event_invite'|'image',
              payload JSONB, created_at)

  Realtime:
    channel 명: room:{room_id}
    Insert event 구독 → JS 측에서 messages 리스트 push

  RPC 신규:
    send_message (room_id, content?, message_type, payload)
    get_or_create_1on1_room (target_user_id)
    list_my_chat_rooms
    list_room_messages (room_id, limit, before_cursor)
    mark_room_read

Phase 8 — 설정 화면
─────────────────────────────────────────────────────────
  파일:
    app/settings/index.tsx (없으면 신규, 있으면 확장)
    각 sub: notifications, privacy, location, blocked, account, terms

  spec 의 권한/설정 매트릭스 (섹션 10) 그대로 옮기기.

============================================================
ORDER OF OPERATIONS (실제 작업 순서)
============================================================

다음 순서로 한 phase 끝날 때마다 typecheck 돌리고 git commit:

Day 1: Phase 0 (토큰 + 폰트) + Phase 1 (글로벌 UI)
Day 2: Phase 2 (지도)
Day 3: Phase 3 (피드) + Phase 4 (소셜) DB 부분만
Day 4: Phase 4 (소셜) UI + Phase 5 (캐릭터) DB
Day 5: Phase 5 (캐릭터) UI + Phase 6 (프로필) DB
Day 6: Phase 6 (프로필) UI
Day 7: Phase 7 (메시지) + Phase 8 (설정)

각 Phase 끝나면:
  1. `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "<phase 관련 파일>"`
     출력 0 줄 확인
  2. SQL 마이그레이션 파일이 새로 추가됐으면 사용자에게 알림:
     "다음 명령으로 마이그레이션 push 하세요: `supabase db push`"
  3. 새 Edge Function 이 추가됐으면 사용자에게 알림:
     "다음 명령으로 함수 deploy 하세요: `npx supabase functions deploy <name>`"
  4. 새 Storage 버킷이 필요하면 사용자에게 알림:
     "Supabase 대시보드에서 다음 버킷 만드세요: <name>, <public>, <size>, <mime>"
  5. 새 secret 이 필요하면 알림:
     "다음 secret 추가하세요: `npx supabase secrets set OPENWEATHER_API_KEY=...`"
  6. git commit (한국어 메시지, spec 어느 섹션을 어디 적용했는지 명시)

============================================================
COMMIT 메시지 형식
============================================================

각 phase 끝 후:

feat(spec-phase-N): {phase 이름} — {핵심 변경 1줄}

- 적용 spec 섹션: §{X.Y}
- 변경 파일: {key files}
- DB 변경: {migrations 추가 여부}
- Edge Function 변경: {신규/수정}
- Storage 버킷 신규: {목록}
- 외부 의존: {API 키, 폰트 파일 등}
- iOS 영향: 없음 (Android 분기만 / 또는 공통 코드 신규)
- OTA: 가능

============================================================
끝났을 때 사용자에게 줄 최종 보고서
============================================================

작업 완료 후 다음 형식으로 보고:

## 완료 요약
- Phase 0~8 중 완료한 것 / 남은 것
- 추가된 마이그레이션 파일 수
- 추가된 Edge Function 수
- 추가된 Storage 버킷 (사용자가 dashboard 에서 만들어야 함)
- 추가된 secrets (사용자가 set 해야 함)
- 추가된 폰트 파일 (사용자가 다운로드해서 assets/fonts/ 에 둬야 함)

## 사용자가 해야 할 외부 작업 (순서대로)
1. assets/fonts/ 에 Pretendard + BagelFatOne ttf 다운로드
2. Supabase secrets:
     OPENWEATHER_API_KEY
     (기존 ANTHROPIC_API_KEY 가 있으면 재사용)
3. Storage 버킷 생성 (Supabase Dashboard):
     stories, place-memories, diary-photos, traces
4. 마이그레이션 push: supabase db push
5. Edge Function deploy: 다음 N개를 한 번에
6. OTA 배포: eas update --channel production --message "spec phase N 적용"

## 검증 체크리스트
- iOS / Android Z Flip 양쪽 단말 OTA 받은 후 각 phase 화면 확인
- 마커 깨짐 없음
- 폰트 로딩 됨 (BagelFatOne 이 글자에 적용됨)
- 새 기능 (스토리/일기장/룩북/메시지) 동작

============================================================
지금 시작해라.
============================================================
````

---

## Part 2 — 본인이 외부에서 직접 해야 할 작업 (타이밍별)

> ✅ **단말 native 1.2.0 확인됨** — 모든 작업이 OTA 범위 안에서 진행됩니다. Production 빌드 / 스토어 재제출 / TestFlight 다 불필요.

Claude Code 가 코드 / 마이그레이션 / Edge Function 파일을 다 만들지만, **다음은 본인이 직접 손으로 해야 합니다** (자격 / 권한 / 결제 접근이 필요한 부분).

작업 시점에 따라 세 그룹으로 나뉩니다:

---

### 🟧 시작 전 — Claude Code 띄우기 직전 30분 (한 번만, prerequisites)

Claude Code 가 작성한 코드를 본인이 단말에서 검증하려면 다음 셋이 미리 준비돼 있어야 합니다.

#### 1. 폰트 ttf 다운로드 (Phase 0 검증을 위해)

```bash
cd ~/Projects/WH
mkdir -p assets/fonts
cd assets/fonts/

# Pretendard (OFL, 무료 상업) — github 최신 release
# 정확한 파일명은 https://github.com/orioncactus/pretendard/releases 에서 확인
curl -LO https://github.com/orioncactus/pretendard/releases/download/v1.3.9/Pretendard-1.3.9.zip
unzip -j Pretendard-1.3.9.zip "Pretendard-1.3.9/public/static/Pretendard-Regular.otf" \
                              "Pretendard-1.3.9/public/static/Pretendard-SemiBold.otf" \
                              "Pretendard-1.3.9/public/static/Pretendard-Bold.otf" -d .
rm Pretendard-1.3.9.zip

# Bagel Fat One (OFL, Google Fonts) — 직접 다운로드
# https://fonts.google.com/specimen/Bagel+Fat+One 에서 "Get font" → zip 다운로드 후
# BagelFatOne-Regular.ttf 만 assets/fonts/ 에 두기
```

> 폰트 파일이 없으면 Claude Code 가 만든 `useFonts` 훅이 단말 실행 시 시스템 폰트로 fallback 됩니다 — 만화 톤이 안 나옴.

#### 2. OpenWeather API 키 발급 + secret 등록 (Phase 2 검증을 위해)

```
1) https://openweathermap.org/api → Sign up
2) 무료 플랜 (Current Weather Data, 1000 calls/day) 충분
3) 발급된 API key 복사
4) 터미널:
```

```bash
cd ~/Projects/WH
npx supabase secrets set OPENWEATHER_API_KEY=발급받은_키
```

> 키 없으면 지도 화면 좌상단 날씨 chip 이 빈 상태. 화면은 떠도 데이터 0.

#### 3. pg_cron 활성화 (Phase 4 스토리 만료를 위해)

Supabase Dashboard → SQL Editor 에서 한 번만 실행:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

> 무료 플랜은 5분 미만 주기 불가. spec 은 매시간(`0 * * * *`)이라 무료 플랜에서도 OK.

#### 4. (선택) git 작업트리 깨끗이

```bash
cd ~/Projects/WH
git status              # uncommitted 가 있으면 stash 또는 commit
git pull origin main    # 최신
```

---

### 🟨 Phase 마다 끼어서 — Claude Code 가 알려주면 그때 (per-phase)

Claude Code 가 한 phase 작업 끝낼 때마다:

> "Phase N 완료. 다음 명령 실행해주세요:
>  1. supabase db push
>  2. supabase functions deploy <name>
>  3. eas update --channel production --message '...'
>  그 후 단말에서 OTA 받고 ✅ 알려주시면 Phase N+1 시작합니다"

라는 안내가 옵니다. 이때 본인이 할 작업:

#### 5. SQL 마이그레이션 push

```bash
cd ~/Projects/WH

# (권장) 어떤 변경이 들어가는지 먼저 확인
npx supabase db diff

# production push
npx supabase db push
```

> ⚠️ Phase 5 의 캐릭터 슬롯 변경 (현재 5 → spec 의 6) 같은 destructive 마이그레이션이 있을 수 있어요. db diff 로 한 번 보고 push 하세요.
> Storage 버킷 4개 (`stories`, `place-memories`, `diary-photos`, `traces`) 도 마이그레이션 안에 들어가 있으면 이 push 한 번에 같이 만들어집니다.

#### 6. Edge Function 배포

```bash
cd ~/Projects/WH

# Phase 별로 새로 만들어진 것만 (Claude Code 가 정확한 이름 알려줌)
npx supabase functions deploy weather-current
npx supabase functions deploy generate-exploration-note
npx supabase functions deploy cleanup-expired-stories

# 또는 새 폴더 다 한 번에
for f in supabase/functions/*/; do
  npx supabase functions deploy "$(basename "$f")"
done
```

#### 7. OTA 배포

```bash
cd ~/Projects/WH

# Claude Code 가 만든 commit 확인
git log --oneline -5

# OTA 배포 — production 채널
npx eas update --channel production --message "spec phase N 적용"
```

#### 8. 단말 OTA 수신 + 검증

- 앱 강제 종료 → 재실행 → 자동 다운로드 → 한 번 더 재시작
- 또는 앱 설정 → 업데이트 확인
- 해당 phase 화면 들어가서 디자인 / 기능 확인 → ✅ 또는 ⚠️ Claude Code 에 보고

---

### 🟩 평행 — 시간 날 때 아무 때나 (코드 작업과 무관)

#### 9. 캐릭터 일러스트 16장 생성

`docs/CHARACTER_IMAGE_PROMPTS.md` 의 16개 프롬프트로 GPT Image (gpt-image-1) 에서 생성:

```bash
# 별찌/Adult 1장 먼저 만들고 그걸 reference image 로 첨부한 채 나머지 15장
# 검수 후 Supabase Storage 의 character-assets 버킷으로 업로드:
npx supabase storage cp ./assets/byeolzzi-adult.png \
  ss:///character-assets/byeolzzi/adult.png
```

코드 수정 0 — `getCharacterImageUrl()` 가 자동으로 fetch.

> Phase 5 (캐릭터 탭) 검증할 때 있으면 좋고, 없으면 fallback emoji 로 동작합니다. blocking 아님.

---

## 외부 작업 한 줄 요약 체크리스트

순서대로 (✅ 표시하며 진행):

**🟧 시작 전 (한 번만, ~30분)**
- [ ] Pretendard + BagelFatOne ttf → `assets/fonts/`
- [ ] OpenWeather API 키 발급 → `supabase secrets set OPENWEATHER_API_KEY=...`
- [ ] `CREATE EXTENSION IF NOT EXISTS pg_cron;` (Supabase Dashboard SQL Editor)
- [ ] `git status` 깨끗한지 확인

**🟨 Claude Design 에서**
- [ ] Share → `Handoff to Claude Code...`
- [ ] 터미널에 `docs/CLAUDE_CODE_HANDOFF_PROMPT.md` 의 Part 1 ` ``` ` 블록 복사 → 붙여넣기

**🟨 Phase 마다 (Claude Code 안내 받을 때)**
- [ ] `supabase db push`
- [ ] `npx supabase functions deploy <name>`
- [ ] `npx eas update --channel production --message "..."`
- [ ] 단말 OTA 수신 후 화면 검증 → ✅/⚠️ Claude Code 에 보고

**🟩 평행 (시간 날 때)**
- [ ] GPT Image 로 캐릭터 16장 생성 → `character-assets/` 버킷 업로드
- [ ] iOS / Android Z Flip 양쪽 회귀 테스트 (마커 깨짐 / 폰트 / 새 기능)

---

## 변경 이력

- v1 (2026-05-08): 첫 릴리스. WhereHere_Spec.md 11섹션 분석. Phased prompt + 외부작업 체크리스트.
- v2 (2026-05-08): 단말 1.2.0 확인 → Production 빌드 섹션 제거. Part 2 를 시작전/Phase중/평행 타이밍별로 재구성.
