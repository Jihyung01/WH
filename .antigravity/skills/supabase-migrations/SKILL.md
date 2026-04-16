---
name: supabase-migrations
description: WhereHere의 Supabase DB 마이그레이션 SQL 파일을 작성할 때 자동 로드. supabase/migrations/ 폴더의 30개 파일 컨벤션을 따르며, RLS 정책, PostGIS 확장, 타임스탬프 파일명, 롤백 전략을 포함한다. 마이그레이션은 작성만 하고 실행은 반드시 사람이 한다.
---

# Supabase Migrations Skill

## 언제 쓰는가
- `supabase/migrations/` 새 SQL 파일 작성
- 기존 테이블 ALTER
- RLS 정책 추가·수정
- 새 RPC 함수 추가 (supabase-rpc skill과 같이 로드됨)
- 인덱스·제약조건 추가

## 🚨 절대 규칙

### 1. 자동 실행 금지
```bash
# ❌ 에이전트가 절대 실행 금지
supabase db push
supabase migration up
supabase db reset
```
SQL 파일만 작성. 실행은 사용자가 Supabase CLI 또는 대시보드에서 직접.

### 2. 파일명 규약
```
YYYYMMDDHHmmss_snake_case_description.sql
```
예: `20260416143000_add_daily_step_rewards_table.sql`

- 타임스탬프는 **현재 UTC 시간 기준**
- description은 무엇을 하는지 한 눈에 드러나게

### 3. 프로덕션 데이터 파괴 작업 경고
```sql
-- 이런 구문이 포함되면 반드시 작업 시작 시 경고:
DROP TABLE ...
TRUNCATE ...
ALTER COLUMN ... DROP ...
DELETE FROM ... WHERE ...
```

## 표준 마이그레이션 템플릿

```sql
-- supabase/migrations/20260416143000_example_migration.sql

-- ============================================
-- Description: <한 줄 설명>
-- Breaking: no
-- Dependencies: <이전 마이그레이션 의존성>
-- Rollback: <롤백 방법 설명 또는 "수동">
-- ============================================

BEGIN;

-- 1. 스키마 변경
CREATE TABLE IF NOT EXISTS public.example_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_example_user_id 
  ON public.example_table(user_id);

-- 3. Updated_at 자동 갱신 트리거
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.example_table
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4. RLS 활성화
ALTER TABLE public.example_table ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책
CREATE POLICY "users_select_own"
  ON public.example_table
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own"
  ON public.example_table
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own"
  ON public.example_table
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own"
  ON public.example_table
  FOR DELETE
  USING (auth.uid() = user_id);

-- 6. 권한 (anon/authenticated role)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.example_table TO authenticated;
-- anon role은 필요할 때만 명시적으로 grant

-- 7. (선택) 관련 RPC 함수
-- 섹션 내용은 supabase-rpc skill 참조

COMMIT;
```

## WhereHere 기존 테이블 컨벤션

### 공통 컬럼
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

### 위치 컬럼 (PostGIS)
```sql
location GEOGRAPHY(POINT, 4326)
-- GIST 인덱스 필수
CREATE INDEX idx_events_location ON events USING GIST(location);
```

### JSONB 사용처
- `profiles.explorer_type` — 성격 진단 결과
- `events.visibility_conditions` — 날씨/시간대 조건
- `community_submissions.music_json` — Apple Music 첨부
- **가급적 구조화된 컬럼 선호**. JSONB는 가변적/선택적 데이터에만

### Enum 대신 CHECK 제약
```sql
-- ❌ Postgres ENUM은 ALTER 어려움
CREATE TYPE mood AS ENUM (...);

-- ✅ CHECK 제약 사용
mood TEXT NOT NULL CHECK (mood IN ('happy', 'excited', 'tired', 'curious', 'proud', 'adventurous'))
```

## RLS 정책 패턴

### 자신의 데이터만
```sql
CREATE POLICY "self_only" 
  ON public.table_name 
  FOR ALL 
  USING (auth.uid() = user_id);
```

### 공개 조회 + 본인만 수정
```sql
CREATE POLICY "public_read" 
  ON public.table_name 
  FOR SELECT 
  USING (true);

CREATE POLICY "owner_write" 
  ON public.table_name 
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 친구만 조회 (friendships 참조)
```sql
CREATE POLICY "friends_can_read" 
  ON public.friend_locations 
  FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR auth.uid() IN (
      SELECT CASE 
        WHEN requester_id = user_id THEN receiver_id 
        ELSE requester_id 
      END
      FROM friendships
      WHERE (requester_id = user_id OR receiver_id = user_id)
      AND status = 'accepted'
    )
  );
```

### 차단 사용자 제외
```sql
CREATE POLICY "exclude_blocked" 
  ON public.community_submissions 
  FOR SELECT 
  USING (
    user_id NOT IN (
      SELECT blocked_user_id FROM user_blocks 
      WHERE blocker_id = auth.uid()
    )
  );
```

## 기존 테이블 ALTER 시 주의

### 컬럼 추가 (안전)
```sql
-- ✅ 기본값과 함께 추가 — 기존 행에 영향 최소
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS mbti TEXT CHECK (mbti ~ '^[EI][NS][TF][JP]$');
```

### 컬럼 삭제 (위험)
```sql
-- ⚠️ 데이터 손실. 사용자에게 확인 필수.
-- 권장: 먼저 NOT NULL 제약 제거 → 앱 코드에서 사용 중단 → 다음 마이그레이션에서 DROP
ALTER TABLE public.profiles ALTER COLUMN old_field DROP NOT NULL;
-- 이후 별도 마이그레이션:
ALTER TABLE public.profiles DROP COLUMN old_field;
```

### 컬럼 이름 변경
```sql
-- ⚠️ 앱 코드와 동기화 필요. 단계적 접근:
-- 1단계: 새 컬럼 추가, 트리거로 기존→신규 복제
-- 2단계: 앱 코드 업데이트 (OTA 배포)
-- 3단계: 기존 컬럼 삭제
```

### 타입 변경
```sql
-- 새 호환 타입
ALTER TABLE ... ALTER COLUMN ... TYPE BIGINT;

-- 비호환 타입 (USING 절 필수)
ALTER TABLE ... ALTER COLUMN age TYPE TEXT USING age::TEXT;
```

## 인덱스 전략

### 필수 인덱스
- 모든 FK 컬럼
- 위치 컬럼 (GIST)
- 자주 WHERE/ORDER BY에 쓰이는 컬럼
- 조합 쿼리에는 composite index

### 예시
```sql
-- 단일 컬럼
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);

-- Composite (user_id, created_at) — 유저별 최근 순
CREATE INDEX IF NOT EXISTS idx_checkins_user_created 
  ON checkins(user_id, created_at DESC);

-- Partial (활성 이벤트만)
CREATE INDEX IF NOT EXISTS idx_events_active 
  ON events(id) 
  WHERE is_active = true;

-- GIN (JSONB)
CREATE INDEX IF NOT EXISTS idx_events_conditions 
  ON events USING GIN (visibility_conditions);
```

## 트리거 활용

### Updated_at 자동 갱신
```sql
-- 이미 존재하는 공통 함수
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 적용
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.example_table
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
```

### 신규 유저 프로필 자동 생성 (이미 존재)
```sql
-- auth.users에 row 생성 시 profiles에도 자동
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## 롤백 전략

### 마이그레이션 파일 맨 아래 주석으로 롤백 기록
```sql
-- ...main migration above...

-- ============================================
-- ROLLBACK (수동 실행용 — 자동 롤백 없음)
-- ============================================
-- BEGIN;
-- DROP POLICY "users_select_own" ON public.example_table;
-- DROP TABLE public.example_table;
-- COMMIT;
```

실제 롤백은 별도 마이그레이션 파일로 작성 권장 (파일명은 `..._revert_<original>`).

## Seed 데이터

데이터 시딩은 **마이그레이션 파일에 넣지 말 것**. 별도 seed.sql 사용 또는 RPC로.

예외: enum-like 참조 테이블 초기값 (예: `coin_products` 카탈로그)
```sql
INSERT INTO public.coin_products (product_id, coins, price_usd) VALUES
  ('wh_coins_500_pack', 500, 4.99),
  ('wh_coins_1200', 1200, 9.99),
  ('wh_coins_3500', 3500, 19.99),
  ('wh_coins_8000', 8000, 39.99),
  ('wh_coins_20000', 20000, 89.99)
ON CONFLICT (product_id) DO UPDATE SET 
  coins = EXCLUDED.coins,
  price_usd = EXCLUDED.price_usd;
```

## 체크리스트

마이그레이션 파일 완료 전:
- [ ] 파일명 타임스탬프 현재 UTC
- [ ] 상단 주석에 Description / Breaking / Rollback 기재
- [ ] BEGIN ... COMMIT으로 감쌈
- [ ] RLS 활성화 (`ENABLE ROW LEVEL SECURITY`)
- [ ] RLS 정책 SELECT/INSERT/UPDATE/DELETE 각각 명시
- [ ] GRANT 문 포함 (authenticated role)
- [ ] 필요한 인덱스 포함 (FK, 위치, 자주 쿼리되는 컬럼)
- [ ] `updated_at` 트리거 (수정 가능 테이블)
- [ ] ON CONFLICT 처리 (upsert 시)
- [ ] IF NOT EXISTS / IF EXISTS로 idempotent 보장
- [ ] **자동 실행 시도 안 함**. 사용자에게 SQL 파일만 전달.
- [ ] 기존 코드에 영향 있으면 TypeScript 타입도 함께 업데이트 (`src/types/models.ts`)

## OTA 배포와의 관계
- DB 스키마 변경은 **OTA와 무관**. 서버 사이드 변경.
- 단, 변경된 스키마를 쓰는 클라이언트 코드는 OTA로 배포 가능
- 순서: 마이그레이션 먼저 실행 → 앱 코드 OTA 배포 (역순 시 기존 앱 크래시 위험)
