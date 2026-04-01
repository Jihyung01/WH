-- Security Advisor: RLS disabled in public — enable + policies.
-- Tables may exist only on some projects (Dashboard 실험/PostGIS 등). 없으면 건너뜀.
-- service_role / postgres 는 RLS 우회(기본).

--------------------------------------------------------------------------------
-- spatial_ref_sys (PostGIS): 시스템/확장 소유 테이블이라 Supabase 일반 역할은
-- ALTER ... ENABLE RLS 불가(42501 must be owner). Advisor 경고는 남을 수 있음 → 무시하거나
-- PostGIS를 extensions 스키마만 쓰도록 프로젝트 설정을 맞추는 식으로 처리.
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
-- user_id 가 있으면: 본인 행만 (일반 사용자 데이터)
--------------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'user_visits',
    'user_personality',
    'location_history',
    'ai_conversations',
    'gathering_participants',
    'shares',
    'completed_quests'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id'
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_authenticated_own', t);
    -- user_id 가 uuid 이든 text(문자열 UUID) 이든 비교 가능
    EXECUTE format(
      $f$
      CREATE POLICY %I ON public.%I
      FOR ALL TO authenticated
      USING ((user_id)::text = (auth.uid())::text)
      WITH CHECK ((user_id)::text = (auth.uid())::text)
      $f$,
      t || '_authenticated_own',
      t
    );
  END LOOP;
END $$;

--------------------------------------------------------------------------------
-- completed_quests: user_id 없고 profile_id 만 있는 경우 (profiles.id = auth.uid())
--------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.completed_quests') IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'completed_quests' AND column_name = 'user_id'
  ) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'completed_quests' AND column_name = 'profile_id'
  ) THEN
    RETURN;
  END IF;

  ALTER TABLE public.completed_quests ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS completed_quests_profile_own ON public.completed_quests;
  CREATE POLICY completed_quests_profile_own
    ON public.completed_quests FOR ALL TO authenticated
    USING ((profile_id)::text = (auth.uid())::text)
    WITH CHECK ((profile_id)::text = (auth.uid())::text);
END $$;

--------------------------------------------------------------------------------
-- 배지: 마스터는 읽기, 유저-배지는 본인만 (스키마와 동일)
--------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.badges') IS NOT NULL THEN
    ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS badges_select_authenticated ON public.badges;
    CREATE POLICY badges_select_authenticated
      ON public.badges FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.user_badges') IS NOT NULL THEN
    ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS user_badges_select_own ON public.user_badges;
    DROP POLICY IF EXISTS user_badges_insert_own ON public.user_badges;
    CREATE POLICY user_badges_select_own
      ON public.user_badges FOR SELECT
      TO authenticated
      USING ((user_id)::text = (auth.uid())::text);
    CREATE POLICY user_badges_insert_own
      ON public.user_badges FOR INSERT
      TO authenticated
      WITH CHECK ((user_id)::text = (auth.uid())::text);
  END IF;
END $$;

--------------------------------------------------------------------------------
-- 카탈로그형: 로그인 사용자 읽기만 (쓰기는 서비스 롤)
--------------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['challenges', 'partner_places'];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_authenticated', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      t || '_select_authenticated',
      t
    );
  END LOOP;
END $$;

--------------------------------------------------------------------------------
-- gatherings: 컬럼에 맞춰 정책 (created_by / organizer_id / user_id 중 존재하는 것)
--------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.gatherings') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.gatherings ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS gatherings_select_authenticated ON public.gatherings;
  CREATE POLICY gatherings_select_authenticated
    ON public.gatherings FOR SELECT
    TO authenticated
    USING (true);

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gatherings' AND column_name = 'created_by'
  ) THEN
    DROP POLICY IF EXISTS gatherings_insert_creator ON public.gatherings;
    DROP POLICY IF EXISTS gatherings_update_creator ON public.gatherings;
    DROP POLICY IF EXISTS gatherings_delete_creator ON public.gatherings;
    CREATE POLICY gatherings_insert_creator
      ON public.gatherings FOR INSERT TO authenticated
      WITH CHECK ((created_by)::text = (auth.uid())::text);
    CREATE POLICY gatherings_update_creator
      ON public.gatherings FOR UPDATE TO authenticated
      USING ((created_by)::text = (auth.uid())::text)
      WITH CHECK ((created_by)::text = (auth.uid())::text);
    CREATE POLICY gatherings_delete_creator
      ON public.gatherings FOR DELETE TO authenticated
      USING ((created_by)::text = (auth.uid())::text);
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gatherings' AND column_name = 'organizer_id'
  ) THEN
    DROP POLICY IF EXISTS gatherings_insert_organizer ON public.gatherings;
    DROP POLICY IF EXISTS gatherings_update_organizer ON public.gatherings;
    DROP POLICY IF EXISTS gatherings_delete_organizer ON public.gatherings;
    CREATE POLICY gatherings_insert_organizer
      ON public.gatherings FOR INSERT TO authenticated
      WITH CHECK ((organizer_id)::text = (auth.uid())::text);
    CREATE POLICY gatherings_update_organizer
      ON public.gatherings FOR UPDATE TO authenticated
      USING ((organizer_id)::text = (auth.uid())::text)
      WITH CHECK ((organizer_id)::text = (auth.uid())::text);
    CREATE POLICY gatherings_delete_organizer
      ON public.gatherings FOR DELETE TO authenticated
      USING ((organizer_id)::text = (auth.uid())::text);
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gatherings' AND column_name = 'user_id'
  ) THEN
    DROP POLICY IF EXISTS gatherings_all_owner ON public.gatherings;
    CREATE POLICY gatherings_all_owner
      ON public.gatherings FOR ALL TO authenticated
      USING ((user_id)::text = (auth.uid())::text)
      WITH CHECK ((user_id)::text = (auth.uid())::text);
  END IF;
END $$;

--------------------------------------------------------------------------------
-- gathering_participants: user_id 없고 gathering_id 만 있는 경우(조인 테이블)
--------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.gathering_participants') IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gathering_participants' AND column_name = 'user_id'
  ) THEN
    RETURN;
  END IF;

  ALTER TABLE public.gathering_participants ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS gathering_participants_select_authenticated ON public.gathering_participants;
  CREATE POLICY gathering_participants_select_authenticated
    ON public.gathering_participants FOR SELECT
    TO authenticated
    USING (true);
  -- INSERT/UPDATE/DELETE 정책 없음 → 클라이언트는 변경 불가, service_role 만 우회
END $$;
