-- WhereHere — Google OAuth 가입 시 "Database error saving new user" 해결
--
-- 문제
--   handle_new_user() 트리거가 raw_user_meta_data->>'name'을 그대로 username으로
--   사용했고, profiles.username에는 UNIQUE 제약이 걸려 있음. 같은 display name을
--   가진 사용자(카카오 가입자 등)가 이미 존재하면 unique_violation 발생 →
--   트리거 전체가 실패해 Supabase 가입 자체가 롤백됨.
--
-- 수정
--   1. display name 으로 후보를 잡되, 이미 있으면 4자리 랜덤 suffix를 붙여 회피
--   2. 그래도 실패하면 UUID 기반 fallback (항상 유일)
--   3. INSERT 는 ON CONFLICT (id) DO NOTHING — 이미 profiles row 존재해도 통과
--   4. EXCEPTION WHEN OTHERS 로 감싸 어떤 이유로든 profiles 생성이 실패해도
--      auth.users 생성 자체는 성공하게 함 (클라이언트의 ensureProfileRow 가
--      로그인 직후 upsert 로 복구함)
--
-- 배포
--   supabase db push

SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_username text;
  v_username text;
  v_attempt int := 0;
BEGIN
  -- 1) 후보 결정: raw_user_meta_data의 여러 키를 모두 시도, 최종 fallback은 UUID 앞 8자리
  v_base_username := COALESCE(
    NULLIF(btrim(new.raw_user_meta_data ->> 'username'), ''),
    NULLIF(btrim(new.raw_user_meta_data ->> 'name'), ''),
    NULLIF(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(btrim(new.raw_user_meta_data ->> 'preferred_username'), ''),
    'user_' || left(replace(new.id::text, '-', ''), 8)
  );
  -- username 길이 상한 (24자 → suffix 6자 포함해도 30자 이내)
  v_base_username := left(v_base_username, 24);
  v_username := v_base_username;

  -- 2) 충돌 시 랜덤 suffix로 회피 (최대 5회)
  WHILE v_attempt < 5 AND EXISTS (
    SELECT 1 FROM public.profiles WHERE username = v_username
  ) LOOP
    v_attempt := v_attempt + 1;
    v_username := v_base_username || '_' || substr(
      md5(random()::text || clock_timestamp()::text || new.id::text), 1, 4
    );
  END LOOP;

  -- 3) 최종 fallback: UUID 기반 (충돌 불가능)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
    v_username := 'user_' || replace(new.id::text, '-', '');
  END IF;

  -- 4) INSERT — profiles row가 이미 있으면 그냥 통과
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, v_username)
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- 어떤 이유로든 profiles 생성이 실패해도 auth.users 생성 자체는 막지 않는다.
  -- 클라이언트(authStore.ensureProfileRow)가 로그인 직후 upsert 로 동일 row를
  -- 채워주므로 사용자 경험이 깨지지 않는다. 대신 Postgres 로그에 남겨둔다.
  RAISE WARNING '[handle_new_user] profile creation skipped for %: % / %',
    new.id, SQLERRM, SQLSTATE;
  RETURN new;
END;
$$;

-- 트리거는 이미 on_auth_user_created 이름으로 존재. 함수만 교체되면 자동 반영.
