---
name: supabase-rpc
description: WhereHere의 Supabase RPC 함수(PostgreSQL stored procedure)를 읽고, 작성하고, 수정할 때 자동 로드. PostGIS 기반 위치 쿼리, 체크인 검증, 코인/XP 지급, 리더보드, 크루/친구 시스템 관련 RPC를 다룰 때 이 skill을 참조한다. 마이그레이션 실행은 사람이 하지만, SQL 파일 생성은 이 skill 규약을 따른다.
---

# Supabase RPC 작업 Skill

## 언제 쓰는가
- `src/lib/api.ts` 내 `supabase.rpc()` 호출 관련 작업
- `supabase/migrations/*.sql` 내 RPC 함수 추가·수정
- PostGIS 기반 위치 쿼리 (`get_nearby_events`, `update_my_location` 등)
- 체크인 검증, 보상 지급, 리더보드, 친구/크루 관련 함수

## 현재 존재하는 주요 RPC (수정 전 참조)

### 위치 & 이벤트
- `get_nearby_events(lat, lng, radius_km)` → PostGIS `ST_DWithin` 사용
- `get_recommended_events(user_id)` → AI 추천 결과 + 사용자 취향 반영
- `verify_and_create_checkin(event_id, lat, lng)` → 거리 검증 후 체크인 생성
- `update_my_location(lat, lng)` → 친구 실시간 위치 갱신

### 보상 & 경제
- `grant_checkin_coins(user_id, amount)`
- `grant_quiz_coins(user_id, amount)`
- `grant_referral_coins(referrer_id, referee_id)`
- `claim_daily_reward(user_id)` → 스트릭 계산 포함
- `claim_daily_step_reward(user_id, steps)` → 1K/3K/5K/10K 마일스톤

### 캐릭터
- `purchase_cosmetic(cosmetic_id)` → 코인 차감 + 인벤토리 추가 (트랜잭션)
- `equip_cosmetic` / `unequip_cosmetic`
- `check_and_grant_titles(user_id)` → 조건부 칭호 부여
- `update_character_personality(user_id)` → 탐험 기록 기반 성격 재계산

### 소셜
- `send_friend_request(target_nickname)`
- `respond_friend_request(request_id, accept: bool)`
- `create_crew`, `join_crew(invite_code)`
- `gift_cosmetic(recipient_id, cosmetic_id)`
- `toggle_feed_like`, `add_feed_comment`, `get_community_feed`
- `block_user(target_user_id)`

### 시즌 & 통계
- `get_active_season()`
- `add_season_xp(user_id, amount)`
- `claim_season_reward(season_id, level)`
- `get_weekly_leaderboard(district?)` → 지역별 필터링 가능
- `get_user_stats(user_id)`
- `get_streak_info(user_id)`

## 새 RPC 작성 규약

### 1. 명명 규칙
- 동사_목적어 snake_case
- 조회: `get_*`, 업데이트: `update_*`, 검증+생성: `verify_and_create_*`, 지급: `grant_*`, 수령: `claim_*`
- 소셜 액션: `send_*`, `respond_*`, `toggle_*`

### 2. 파라미터
```sql
-- 권장 패턴
CREATE OR REPLACE FUNCTION public.example_rpc(
  p_user_id UUID DEFAULT auth.uid(),  -- 기본값으로 현재 사용자
  p_target_id UUID,
  p_amount INTEGER
)
RETURNS TABLE(...)  -- 구체적인 반환 타입 명시
LANGUAGE plpgsql
SECURITY DEFINER  -- RLS 우회 필요 시만
SET search_path = public
AS $$
BEGIN
  -- 1. 입력 검증
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;
  
  -- 2. 권한 확인 (SECURITY DEFINER일 때 필수)
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  -- 3. 비즈니스 로직 (가능하면 단일 트랜잭션)
  ...
  
  -- 4. 결과 반환
  RETURN QUERY SELECT ...;
END;
$$;
```

### 3. 권한
- `GRANT EXECUTE ON FUNCTION public.example_rpc TO authenticated;`
- `anon` role에는 기본 EXECUTE 주지 않기. 공개 필요 시 명시

### 4. 반환 타입
- 단일 값 → scalar 반환
- 여러 행 → `RETURNS TABLE(...)`
- 복합 객체 → `RETURNS json` 또는 커스텀 composite type

## 클라이언트 호출 규약 (`src/lib/api.ts`)

모든 RPC는 이 파일의 함수로 래핑:

```typescript
// ✅ 올바른 패턴
export async function grantCheckinCoins(amount: number): Promise<number> {
  const { data, error } = await supabase.rpc('grant_checkin_coins', {
    p_user_id: (await supabase.auth.getUser()).data.user?.id,
    p_amount: amount,
  });
  if (error) throw new Error(`grant_checkin_coins failed: ${error.message}`);
  return data as number;
}

// ❌ 피해야 할 패턴 (컴포넌트에서 직접 호출)
const { data } = await supabase.rpc('grant_checkin_coins', ...);
```

## PostGIS 사용 시

- 거리 계산: `ST_DWithin(location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius_meters)`
- 정렬: `ORDER BY ST_Distance(location, point)`
- 인덱스: 위치 컬럼에 `CREATE INDEX ... USING GIST (location)` 필수
- **radius 단위**: 클라이언트에서 km, 서버에서 미터 변환 (`radius_km * 1000`)

## 함정 & 주의사항

### 1. SECURITY DEFINER 오용
- SECURITY DEFINER는 함수 소유자 권한으로 실행됨
- 내부에서 반드시 `auth.uid()` 체크. 안 하면 임의 사용자 데이터 조작 가능
- 단순 조회용 RPC는 SECURITY INVOKER (기본) 유지

### 2. 트랜잭션 실패 시 롤백 누락
- PostgreSQL 함수는 기본적으로 단일 트랜잭션이지만, 예외를 잡아버리면 롤백 안 됨
- `BEGIN ... EXCEPTION WHEN OTHERS THEN RAISE;` 패턴으로 명시적 rethrow

### 3. Race Condition (코인·XP 동시 갱신)
```sql
-- ❌ 위험
UPDATE profiles SET coins = coins + 10 WHERE id = user_id;

-- ✅ 안전 (SELECT FOR UPDATE 또는 atomic)
UPDATE profiles SET coins = COALESCE(coins, 0) + 10 
WHERE id = user_id 
RETURNING coins;
```

### 4. RLS와 RPC의 관계
- RPC 내부 SELECT도 RLS 적용됨 (SECURITY INVOKER일 때)
- cross-user 데이터 조회가 필요하면 SECURITY DEFINER + 수동 권한 체크

### 5. 반환 NULL 처리
- 클라이언트는 `null` 받으면 에러로 처리. 빈 결과는 빈 배열 `[]` 또는 `{}`로 반환

## 마이그레이션 파일 규약

```sql
-- supabase/migrations/20260416120000_add_example_rpc.sql

-- Description: <한 줄 설명>
-- Breaking: no | yes (기존 코드에 영향)

BEGIN;

CREATE OR REPLACE FUNCTION public.example_rpc(...)
...;

GRANT EXECUTE ON FUNCTION public.example_rpc TO authenticated;

COMMIT;
```

**중요**: 마이그레이션 파일 작성 후 **사람이 `supabase db push` 실행**. 에이전트는 절대 자동 실행 금지.

## 작업 체크리스트

새/수정 RPC 완료 전:
- [ ] 입력 검증 포함 (NULL, 범위, 권한)
- [ ] `SECURITY DEFINER` 사용 시 `auth.uid()` 체크 포함
- [ ] GRANT EXECUTE 문 포함
- [ ] 반환 타입 TypeScript 쪽과 일치 (`src/types/api.ts`)
- [ ] `src/lib/api.ts`에 호출 wrapper 추가
- [ ] 호출 wrapper 타입 명시 (no any)
- [ ] 마이그레이션 파일명 타임스탬프 정확
- [ ] 에러 메시지 영어 (서버) / 클라이언트에서 한국어 변환
