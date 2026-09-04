ALTER TABLE public.mentor_preferences
  ADD COLUMN IF NOT EXISTS mentorship_topics text[] NOT NULL DEFAULT '{}';