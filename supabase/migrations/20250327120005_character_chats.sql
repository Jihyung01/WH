SET search_path = public, extensions;

CREATE TABLE IF NOT EXISTS public.character_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  character_type text NOT NULL,
  user_message text NOT NULL,
  ai_reply text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX character_chats_user_id_idx ON public.character_chats (user_id);
CREATE INDEX character_chats_created_idx ON public.character_chats (created_at DESC);

ALTER TABLE public.character_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chats"
  ON public.character_chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert chats"
  ON public.character_chats FOR INSERT
  WITH CHECK (true);
