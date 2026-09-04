ALTER TABLE public.mentor_matches
  ADD COLUMN IF NOT EXISTS request_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS mentor_matches_request_token_key ON public.mentor_matches (request_token);