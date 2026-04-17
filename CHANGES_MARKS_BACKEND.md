# CHANGES — Marks (흔적) Backend

Branch: `feat/marks-backend-20260417`

## 요약
"흔적(Mark)" 시스템의 서버 사이드(테이블·RPC·RLS) + 클라이언트 API/타입을 추가한다.
이벤트(퀘스트)보다 훨씬 가벼운, 위치 기반 한줄 낙서 콘텐츠이다.
UI는 별도 에이전트(B)가 담당하며 본 브랜치는 백엔드 컨트랙트만 확정한다.

## 신규 파일

### SQL 마이그레이션 (자동 실행 금지 — 본 브랜치는 "작성만")
- `supabase/migrations/20260417120000_create_marks_table.sql`
  - `public.marks` 테이블 (PostGIS `geography(Point, 4326)`, content 1~200자, visibility 3종)
  - 인덱스: `GIST(location)`, `(user_id, created_at DESC)`, active-only partial, `visibility`, `district`
  - `updated_at` 트리거 (`public.set_updated_at()`)
  - RLS: SELECT는 차단·만료·가시성 필터 / INSERT·UPDATE·DELETE는 `auth.uid() = user_id`
  - GRANT: `authenticated` 전용 (anon 차단)

- `supabase/migrations/20260417120100_create_marks_rpcs.sql`
  - `public.create_mark(...)` — 생성 + XP +2 + 오늘 흔적수 + `should_generate_journal` 플래그
  - `public.get_nearby_marks(lat,lng,radius_km,limit)` — ST_DWithin + profiles/characters JOIN
  - `public.get_my_marks(date,limit)` — 본인 흔적 타임라인(일별 오름차순)
  - `public.get_today_mark_count()` — 오늘의 내 흔적수 (일지 자동생성 판단용)
  - 모두 `SECURITY DEFINER`, `search_path = public, extensions`, `authenticated` GRANT

### 클라이언트 (TypeScript)
- `src/types/models.ts` — `MarkVisibility`, `MarkMusicAttachment`, `Mark`, `CreateMarkParams`, `CreateMarkResult` 추가
- `src/types/index.ts` — 위 타입 re-export
- `src/lib/api.ts` — "Marks" 섹션 신설
  - `uploadMarkPhoto(uri)` — `marks-photos` 버킷 업로드 → public URL
  - `createMark(params)` → `CreateMarkResult` (RPC `create_mark`)
  - `getNearbyMarks(lat, lng, radiusKm?)` → `Mark[]` (RPC `get_nearby_marks`)
  - `getMyMarks(date?)` → `Mark[]` (RPC `get_my_marks`)
  - `getTodayMarkCount()` → `number` (RPC `get_today_mark_count`)
  - `triggerGenerateJournalFromMarks()` — Edge Function `generate-journal` 위임 (일지 자동 생성)

## 주요 설계 결정

### 1) `location`은 `geography(Point, 4326)`
- 기존 `get_nearby_events` 패턴 그대로 차용 (`ST_DWithin`, km → m 변환)
- 클라이언트 타입은 `{ lat, lng }` 객체로 정규화 — RPC는 `lat`/`lng` 분리 반환 → `rowToMark()`에서 합침

### 2) `character_emoji`는 RPC에서 파생
- `public.characters`에 emoji 컬럼이 없으므로 `character.name` → 이모지 매핑 (도담 🌱 / 나래 🦋 / 하람 🌊 / 별찌 ⭐)
- `character_class`는 DB 컬럼명 `character_type`을 JOIN alias로 노출

### 3) XP 지급은 `UPDATE ... RETURNING` 한 번으로 원자화
- `profiles.total_xp` 단일 증가. 프로필 미존재 방어로 `coalesce(total_xp,0)+2`
- 글로벌 레벨(`profiles.level`)은 수정하지 않음 — 기존 관례상 파생값, `add_season_xp`가 관리

### 4) `should_generate_journal`
- 오늘 흔적 수 ≥ 3개 → `true`. 클라이언트에서 `triggerGenerateJournalFromMarks()` 호출 후크용
- 일지 생성 본체는 `supabase/functions/generate-journal`(별도 에이전트)

### 5) RLS는 `user_blocks` + `friendships` + `visibility` 3축으로 구성
- 기존 `community_submissions` 패턴을 따르되, `friends` 범위에서는 양방향 `friendships.status='accepted'`만 허용
- 만료된 흔적(`expires_at <= now()`)은 SELECT 자체에서 숨김

## 비호환/영향
- 브레이킹 없음. 기존 테이블/RPC는 수정하지 않음.
- `community_submissions`와 독립된 별도 테이블로 음악 첨부 로직은 중복이지만 feature-scope 분리 원칙 준수.
- 마이그레이션은 작성만 했으며 `db push`는 수동으로 진행해야 한다. (`AGENTS.md` §절대규칙)

## 후속 작업 (다른 에이전트에게 인계)
- UI 에이전트(B): `src/stores/markStore.ts`, `src/components/mark/*`에서 본 컨트랙트 사용
- Edge Function 에이전트: `generate-journal`이 `source: 'marks'` 분기를 처리
- 운영: Supabase Storage에 `marks-photos` 버킷 생성 + 공개 정책 필요
