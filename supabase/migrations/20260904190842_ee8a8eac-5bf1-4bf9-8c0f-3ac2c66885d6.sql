ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS linkedin text,
  ADD COLUMN IF NOT EXISTS websites jsonb;