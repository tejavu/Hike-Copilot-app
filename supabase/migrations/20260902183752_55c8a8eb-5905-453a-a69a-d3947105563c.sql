ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_example BOOLEAN NOT NULL DEFAULT false;
UPDATE public.events SET is_example = true;