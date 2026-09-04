ALTER TABLE public.mentor_preferences
  ADD COLUMN IF NOT EXISTS cooldown_until timestamptz;