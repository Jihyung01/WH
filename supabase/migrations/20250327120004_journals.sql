SET search_path = public, extensions;

CREATE TABLE IF NOT EXISTS public.journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  journal_date date NOT NULL DEFAULT CURRENT_DATE,
  journal_text text NOT NULL,
  share_card jsonb NOT NULL DEFAULT '{}'::jsonb,
  events_completed jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, journal_date)
);

CREATE INDEX journals_user_id_idx ON public.journals (user_id);
CREATE INDEX journals_date_idx ON public.journals (journal_date DESC);

ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journals"
  ON public.journals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert journals"
  ON public.journals FOR INSERT
  WITH CHECK (true);
