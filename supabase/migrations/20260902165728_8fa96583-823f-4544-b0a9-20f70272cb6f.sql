ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'example',
  ADD COLUMN IF NOT EXISTS is_example boolean NOT NULL DEFAULT false;