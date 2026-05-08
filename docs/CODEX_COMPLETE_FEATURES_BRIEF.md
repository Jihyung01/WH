# Codex Brief — WhereHere 미구현 기능 일괄 완성 + 배포

> 작성: 2026-05-08 / 대상: Codex(또는 Claude Code) — **단일 세션에서 전수 마무리**
> 절대 규칙: **iOS 회귀 0**, **새 native 모듈 0**, **app.json 변경 0**, **OTA 가능 범위만**
> 
> 이 브리프 + `/CLAUDE.md` (=`/WhereHere_HARNESS.md`) + `/docs/WhereHere_Spec.md` 3개를 시작 시 모두 읽고 시작할 것.
> 추가 컨텍스트는 `/docs/FINAL_DEPLOY_GUIDE.md`, `/docs/PHASE_0_TO_6_DEPLOY.md`, `/docs/SELF_REVIEW_REPORT.md` 참고.

---

## 0. 사용자 보고 (스크린샷 4장)

| # | 화면 | 증상 | 원인 추정 |
|---|------|------|----------|
| 1 | 지도 탭 | 검색바 "오늘 어디로?!" 가 **누름 반응 없음**. 우측 하단 빨강 recenter FAB ↔ "근처 탐험지" 카루셀이 **여전히 겹침** | `MapSearchBar` 의 `onSearchPress` 미전달 / FAB·carousel z-index, bottom 위치 |
| 2 | 새 일기 | 사진 1장 첨부 후 저장 → "사진 업로드에 실패했습니다" | `diary-photos` storage bucket 정책 미배포 (마이그레이션 푸시 안 됨) |
| 3 | 새 메모리 | 폴라로이드 사진 첨부 후 저장 → "사진 업로드에 실패했습니다" | `place-memories` 정책 미배포 동일 |
| 4 | 탐험 일지 (`/journal`) | 오늘의 일지 만들기 → "일지 생성 실패" | `generate-journal` Edge Function ES256 JWT 호환 버그 (이전 conversation summary 참고) |

추가 사용자 발견:
- 메시지 탭의 4 QuickAction(그룹 만들기 / 단체 영상 / 번개 약속 / 위치 공유) **전부 `showToast('곧 추가됩니다')`** — 미구현
- 친구 프로필 `/user/[id]` 의 **"함께 탐험하기 (준비 중)"** 버튼 disabled

---

## 1. 사전 컨텍스트 (지난 세션 누적)

이번 세션 직전까지 다음이 **이미 구현/추가** 되어있다 (그러나 일부는 **DB push / Edge deploy 가 안 된 상태**).

### 1-A. 신규 SQL 마이그레이션 (=PUSH 필수)
- `supabase/migrations/20260508030329_manga_place_memories_diaries.sql` — `place_memories`, `diaries`, `diary_likes`, `diary_comments` + 7 RPC + Storage 버킷 생성 (`place-memories`, `diary-photos`)
- `supabase/migrations/20260508092934_phase5_messages.sql` — `chat_rooms`, `chat_room_members`, `messages` + 5 RPC (`get_or_create_1on1_room`, `list_my_chat_rooms`, `list_room_messages`, `send_message`, `mark_room_read`) + RLS
- `supabase/migrations/20260508140000_ai_exploration_notes.sql` — `ai_exploration_notes` + `get_latest_exploration_note` RPC
- `supabase/migrations/20260508145000_storage_diary_memory_policies.sql` — diary-photos / place-memories Storage RLS (public read + owner-folder insert/update/delete)

### 1-B. 신규 Edge Function (=DEPLOY 필수)
- `supabase/functions/generate-exploration-note/` — Claude API로 30일 활동 → 만화톤 한 줄 노트 (verify_jwt = false, 본문에서 직접 검증)

### 1-C. 클라이언트 신규 파일
- `app/chat/[room_id].tsx` — 1:1/그룹 채팅방 + Realtime postgres_changes 구독
- `app/(tabs)/messages.tsx` — 매:시지 헤더 + LIVE 배너 + 4 QuickAction + 세그먼트 + 그룹/DM 섹션 (UI는 manga 완성, 하지만 QuickAction onPress 가 모두 placeholder)
- `app/diary/create.tsx`, `app/memory/create.tsx` — 사진 첨부 + InkCard manga UI
- `src/lib/api.ts` 끝부분: `RoomMessage`, `ChatRoomSummary`, `listMyChatRooms`, `getOrCreate1on1Room`, `listRoomMessages`, `sendMessage`, `markRoomRead`, `uploadDiaryPhoto`, `uploadPlaceMemoryPhoto`, `getLatestExplorationNote`, `generateExplorationNote`

### 1-D. 디자인 토큰 / 만화톤
이미 적용 끝. **재작업 금지**. 이번 작업의 기능 추가 시에도 동일 토큰 (잉크 보더 2~2.5px + hard shadow + paper 배경) 으로 신규 UI 만들 것.

---

## 2. 이번에 끝내야 하는 작업 (Phase 8)

### 2-A. 지도 검색 (Spec §1.1)
**파일**: `app/(tabs)/map.tsx`, `src/components/map/MapSearchBar.tsx`
**현재 문제**: `<MapSearchBar>` 에 `onSearchPress` 안 줌 → 누르면 아무 일 없음.

**구현**:
1. **검색 시트**: `BottomSheet (snapPoints: ['85%'])` 새로 만들기 → `src/components/map/MapSearchSheet.tsx`
2. 입력창 자동 focus, 입력 디바운스 250ms
3. 데이터 소스 우선순위:
   1) `events` 테이블 ILIKE 검색 (`title`, `address` 두 컬럼 OR) — 새 RPC `search_events_by_keyword(p_query text, p_limit int)` 추가, `events` GIN(`title gin_trgm_ops`, `address gin_trgm_ops`) 인덱스 (확장 `pg_trgm` 필요)
   2) 결과 없으면 OSM Nominatim search API (https://nominatim.openstreetmap.org/search?q=...&format=json&accept-language=ko&limit=10) — User-Agent 필수, 1 req/sec 룰 준수 (디바운스로 충분)
4. 결과 행 탭 → 지도 카메라 이동 (`mapRef.current?.animateToRegion`) + 시트 닫기. 이벤트면 `onMarkerPress(ev)` 도 호출.
5. 시트 헤더: 잉크 보더 2.5px + paper 배경 + "오늘 어디로?!" + 닫기 X
6. 빈 상태 / 로딩 스켈레톤 / 에러 분기 4가지

**Acceptance**: 검색바 탭 → 시트 열림. "정자" 입력 → 0.5초 안에 events 결과 1+ 줄 노출. 결과 탭 → 지도 카메라 이동.

### 2-B. 지도 FAB ↔ 카루셀 겹침 (Spec §1.1)
**파일**: `app/(tabs)/map.tsx`
**현재 문제**: 우측 하단 recenter FAB(빨강) 가 carousel 위에 겹쳐서 그려짐. (스크린샷 1)

**구현**:
1. FAB stack 의 `bottom: recenterBottom + 200` 을 **동적 계산**으로: `bottom: nearbyPlaces.length > 0 ? recenterBottom + 220 : recenterBottom + 8`
2. 별도 recenter 빨강 FAB 와 `MapFabStack.onLocationPress` 가 둘 다 있는데 **중복**임. 빨강 FAB는 `MapFabStack` 안의 location button과 통합. 단, iOS / Android 양쪽 검증.
3. carousel `pointerEvents="box-none"` 유지. carousel 자체 height 측정해서 FAB bottom = carousel.height + 8 식으로 계산해도 OK.

**Acceptance**: carousel 활성화 시 FAB 가 carousel 위 16px 띄워서 표시. 두 영역이 시각적으로 겹치지 않음. 스크린샷 1과 다른 모양.

### 2-C. 메시지 QuickAction 4개 전부 동작 (Spec §6)
**파일**: `app/(tabs)/messages.tsx`

#### (1) 그룹 만들기
- 새 화면 `app/chat/new-group.tsx` 라우트 추가 (router.push)
- 친구 목록(`getFriends()`) 멀티 선택 + 그룹 이름 + 이모지(12개 프리셋)
- 새 RPC `create_group_chat_room(p_member_ids uuid[], p_title text, p_emoji text)` → returns `room_id`
  - 트랜잭션: chat_rooms INSERT (type='group') + chat_room_members 다건 INSERT + 본인도 멤버
  - RLS: authenticated 만 호출, 멤버 자기 자신 포함 검증
- 만들기 → router.replace(`/chat/${room_id}`)

#### (2) 번개 약속 (lightning meetup)
- 새 화면 `app/meetup/create.tsx` (BottomSheet 도 가능)
- 새 테이블 `lightning_meetups` (id, host_id, title, place_label, place_lat, place_lng, scheduled_at, status, created_at) + RLS (host + 초대된 친구 read)
- 새 테이블 `lightning_meetup_invitees` (meetup_id, user_id, response 'pending'|'accepted'|'declined')
- 새 RPC `create_lightning_meetup(p_title, p_place_label, p_lat, p_lng, p_scheduled_at, p_invitee_ids[])` → returns meetup_id + 자동으로 그룹 채팅방 생성 + 시스템 메시지("⚡ 번개 약속 — 정자동 카페 / 19:00") INSERT
- 새 RPC `respond_lightning_meetup(p_meetup_id, p_response)`
- UI: 제목 / 장소(현 위치 reverse-geocode 자동입력) / 시간(다음 1~12시간 1시간 단위 chip) / 친구 멀티선택
- 만들기 → 그룹방으로 이동 + 알림 푸시 (send-notification Edge 활용)

#### (3) 위치 공유
- 이미 존재: `toggle_location_sharing` RPC + `friend_locations` 테이블 + `subscribeToFriendLocations`
- QuickAction onPress 는 `app/(tabs)/social` 의 위치 공유 toggle 행 으로 스크롤 → 또는 모달로 직접 toggle 노출
- "친구 위치 보기" sheet 새로 추가: 위치공유 ON 친구만 + 거리 표시 + 탭 → 지도 탭으로 이동 + 카메라 그 친구 위치로

#### (4) 단체 영상
- **현 단계 권장**: 외부 의존성 없이 **공유 화면 (그룹 콜 룸 페이지)** 만 만들고 실 video 는 placeholder.
- 새 화면 `app/chat/group-call/[room_id].tsx` — 만화톤 격자 (참가자 아바타 4~9칸) + "마이크/캠 OFF (준비 중)" 버튼들
- 시작 시: chat_rooms.live_video_started_at = now() update RPC `start_group_call(p_room_id)` → messages.tsx LIVE 배너가 자동으로 켜짐 (이미 wired). 종료 시 `end_group_call(p_room_id)` → 컬럼 NULL.
- **실 video 인프라 (Agora/LiveKit/jitsi) 는 native module 추가가 필요해서 OTA 불가** — 따라서 본 phase 는 "방을 켜고 끄는 메타데이터 + 만화톤 placeholder UI" 까지만. 사용자에게 toast 로 "영상 링크는 곧 연결됩니다 — 그룹채팅에서 위치/사진 공유는 가능" 안내.

#### (5) 채팅방 안 단체영상 / 첨부 버튼
- `app/chat/[room_id].tsx` 의 헤더 단체영상 → `start_group_call` 호출
- 첨부(+) → ImagePicker 호출 → `mission-photos` 버킷에 `chat/{userId}/{roomId}/{ts}.{ext}` 업로드 → `sendMessage({roomId, messageType:'image', payload:{url}})`
- Bubble 컴포넌트가 `message_type === 'image'` 면 `<Image>` 렌더링 (잉크 보더 2.5px + hard shadow), `'location'` 이면 지도 미니뷰 + "이 위치로" 칩

### 2-D. 친구 프로필 함께 탐험하기 (Spec §3, §6)
**파일**: `app/user/[id].tsx`

`disabled onPress={() => {}}` 대신:
```tsx
onPress={async () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const roomId = await getOrCreate1on1Room(userId);
    router.push(`/chat/${roomId}` as never);
  } catch (e) {
    Alert.alert('오류', e instanceof Error ? e.message : '잠시 후 다시 시도');
  }
}}
```
라벨 "함께 탐험하기 (준비 중)" → "💬 1:1 메시지" 또는 "함께 탐험하기" (active)
disabled 제거. background = MANGA.y, borderColor = MANGA.ink 로 manga 톤.

### 2-E. 일기/메모리 사진 업로드 실패 (스크린샷 2, 3)
**원인**: `20260508145000_storage_diary_memory_policies.sql` 가 원격 DB 에 push 안 됨.
**해결**: `npx supabase db push` 한 번에 4개 신규 마이그레이션 다 적용. 적용 후 사진 업로드 동작 확인.

### 2-F. 탐험 일지 생성 실패 (스크린샷 4) — `generate-journal` ES256 JWT
**원인**: `supabase/functions/generate-journal/index.ts` 가 `jose` 라이브러리 ES256 JWT를 못 다룸 (이전 conversation 에서 발견).

**해결 옵션 A — verify_jwt = false 로 전환**:
- `supabase/config.toml` 의 `[functions.generate-journal]` 에 `verify_jwt = false` 설정
- 함수 본문에서 직접 `supabaseAdmin.auth.getUser(token)` 으로 검증 (다른 함수와 동일 패턴)

**해결 옵션 B — jose 대신 direct getUser**:
- 함수 헤더 파싱 코드 제거 후 동일 패턴 적용

권장: 옵션 A (config + 본문 둘 다 안전 패턴 통일).

### 2-G. placeholder 화면 5개 (다크 navy 잔존)
이 5개는 빈 placeholder인 채로 남아있음 (다크 navy `#0F172A` 배경 + 영문 fontWeight + 흰 텍스트):
- `app/character/index.tsx` — `app/(tabs)/character.tsx` 로 redirect
- `app/character/customize.tsx` — `app/character-customize.tsx` 로 redirect
- `app/settings/account.tsx` — 실제 화면 구현 (닉네임 변경, 아바타 변경, 로그아웃, 계정 삭제 — `delete-account` Edge 호출)
- `app/settings/notifications.tsx` — 실제 토글 (이벤트 알림 / 친구 위치 알림 / 채팅 메시지 알림) — profiles 테이블 컬럼 또는 별도 user_notification_prefs 테이블 추가
- `app/(tabs)/missions.tsx` — `app/(tabs)/explore.tsx` 로 redirect (이미 hidden tab 이지만 placeholder가 남아 있으면 모듈 lazy-load 시 다크 화면 잠깐 보임)

전부 manga 톤으로. 다크 navy 흔적 모두 제거.

### 2-H. 캐릭터 customize 본 화면 (`app/character-customize.tsx`) 만화톤 강화
257 줄 존재. CharacterPreview + slot tabs + cosmetic grid + equip/unequip — 잉크 보더 2.5px / hard shadow / paper 배경 일관 적용. 옵션 active 시 yellow 배경.

### 2-I. character.tsx 캐릭터 대화 (Spec §4)
- 캐릭터 탭의 "💬 대화" 액션 타일 → 새 화면 `app/character/chat.tsx`
- 기존 `character-chat` Edge Function + `getChatHistory()` (이미 정의됨 — `ChatMessage` 첫 번째 인터페이스, line 1184) 활용
- 1:1 채팅 UI (chat 화면과 비슷하지만 캐릭터 아바타로). 프리미엄 hard limit (하루 20회 — `premiumStore` 참고)

---

## 3. 마이그레이션 / Edge / OTA 배포 절차

```bash
cd ~/Projects/WH

# (0) git lock 정리
rm -f .git/index.lock 2>/dev/null

# (1) DB push — 4개 신규 마이그레이션 + Phase 8 신규 SQL (그룹채팅, 번개약속, 검색 trgm)
npx supabase db push

# (2) Edge Functions 배포
npx supabase functions deploy generate-exploration-note
npx supabase functions deploy generate-journal       # verify_jwt=false 로 재배포

# (3) typecheck — Phase 8 추가 후 baseline 30 유지 또는 감소만 OK
npx tsc --noEmit 2>&1 | grep -v 'supabase/functions' | grep -E 'error TS' | wc -l

# (4) commit + push
git add -A
git commit -m "Phase 8 — 미구현 기능 일괄 완성: 지도검색·QuickAction 4종·번개약속·1:1 진입·placeholder 제거"
git push

# (5) OTA — production channel
eas update --channel production --environment production --message "Phase 8 — 검색·메시지·번개약속·1:1·placeholder 완성"
```

---

## 4. 작업 가드레일 (반드시 준수)

1. **iOS 회귀 0** — `react-native-maps` 의 iOS 분기는 절대 변경 금지. Z Flip Android 마커도 PNG 그대로.
2. **새 native 모듈 0** — `expo install <native>`, `npm install <native>` 금지. 비디오통화 같은 native 의존이 필요한 건 placeholder 만.
3. **app.json 변경 0** — runtimeVersion 1.2.0 유지.
4. **타입 baseline 30 ↓ 유지** — `app/`, `src/` 만. supabase/functions/ 의 Deno 에러는 무시.
5. **모든 신규 RPC 끝에 `NOTIFY pgrst, 'reload schema';`** — schema cache reload 필수.
6. **모든 신규 storage upload는 RLS 검증 후** — 본인 폴더만 insert.
7. **모든 신규 Edge Function 은 `verify_jwt = false` + 본문에서 `supabaseAdmin.auth.getUser(Bearer)` 검증**.
8. **만화 토큰**: paper `#FFFAEB`, paper2 `#FFF5DC`, ink `#1A1612`, y `#FFD93D`, r `#FF4757`, g `#3DDC97`, b `#4FBDFF`, p `#C5A6FF`. 잉크 보더 2~2.5px. hard-shadow `top: 3, left: 3, backgroundColor: ink` underlay 패턴.
9. **모든 결과를 `/docs/PHASE_8_DEPLOY.md` 로 정리**해서 사용자가 한 번에 따라할 수 있게.
10. **placeholder / "준비 중" 텍스트 추가 금지** — 만들 거면 완성. 못 만들 거면 화면을 빼고 라우팅 차단.

---

## 5. 작업 완료 후 출력 형식

```
## Phase 8 완료 요약

### 새로 동작하는 기능
1. ...

### 새 / 수정된 파일
- path/file.tsx — 1줄 설명

### 새 마이그레이션
- 20260509XXXXXX_*.sql

### 배포 명령
[3절 그대로 + 사용자가 복사해서 붙이면 끝나는 형태]

### 수동 테스트 체크리스트 (스크린샷 기반)
1. 지도 탭 검색바 탭 → 시트 → "정자" 입력 → events 결과 노출 → 결과 탭 → 지도 이동
2. 지도 우측 FAB 와 carousel 시각적 분리 (16px 간격)
3. 새 메모리 사진 첨부 → 저장 → 토스트 "메모리 저장됨" → 프로필에서 폴라로이드 보임
4. 새 일기 사진 첨부 → 저장 → 토스트 "일기 저장됨"
5. 탐험 일지 → "오늘의 탐험 일지 만들기" → 정상 생성
6. 메시지 → 그룹 만들기 → 친구 2명 + "테스트크루" → 그룹방 진입 → 메시지 송수신
7. 메시지 → 번개 약속 → 친구 1명 + 19:00 + 정자동 → 그룹방 자동 생성 + 시스템 메시지
8. 메시지 → 위치 공유 → 토글 ON → 다른 기기에서 친구 위치 보임
9. 메시지 → 단체 영상 → 그룹방 LIVE 배너 켜짐
10. 친구 프로필 → "💬 1:1 메시지" → 채팅방 진입
11. 캐릭터 탭 → 대화 → 캐릭터와 채팅 (프리미엄 한도 표시)
12. 설정 → 계정 / 알림 모두 동작
```

---

## 6. 참고 — 주요 파일 인덱스

| 영역 | 파일 |
|---|---|
| 라우팅 / 탭 | `app/(tabs)/_layout.tsx`, `src/components/ui/MangaTabBar.tsx` |
| 지도 | `app/(tabs)/map.tsx`, `src/components/map/*` |
| 메시지 | `app/(tabs)/messages.tsx`, `app/chat/[room_id].tsx` |
| 소셜 | `app/(tabs)/social.tsx` |
| 프로필 | `app/(tabs)/profile.tsx`, `src/components/profile/MangaProfileSections.tsx` |
| 캐릭터 | `app/(tabs)/character.tsx`, `app/character-customize.tsx`, `app/character/chat.tsx`(신규) |
| 일기/메모리 | `app/diary/create.tsx`, `app/memory/create.tsx`, `app/journal.tsx` |
| API | `src/lib/api.ts` (~2200 줄, 끝부분이 Phase 5/7 신규) |
| Stores | `src/stores/*.ts` (14개) |
| Edge | `supabase/functions/*/index.ts` (12개) |
| Migrations | `supabase/migrations/*.sql` (24+개, 20260508 4개가 핵심) |
| Theme | `src/config/theme.ts` (DARK==LIGHT==manga, 변경 금지) |

---

**완료 기준**: 사용자가 1번 OTA 받고 보낸 4장 스크린샷 모든 증상이 해소된 상태 + Phase 8 12개 체크리스트 모두 ✅.

행운을 빈다.
