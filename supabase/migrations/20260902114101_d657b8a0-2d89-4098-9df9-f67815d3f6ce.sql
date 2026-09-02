ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS contact_email text;
UPDATE public.mentors SET contact_email = external_id || '@mentors.ada-demo.invalid' WHERE contact_email IS NULL;

ALTER TABLE public.mentor_sessions
  ADD COLUMN IF NOT EXISTS email_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS email_detail text,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS meeting_format text NOT NULL DEFAULT 'remote';

ALTER TABLE public.mentor_preferences
  ADD COLUMN IF NOT EXISTS preferred_time_of_day text,
  ADD COLUMN IF NOT EXISTS timezone text;

CREATE TABLE IF NOT EXISTS public.session_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.mentor_sessions(id) ON DELETE CASCADE,
  mentor_id uuid REFERENCES public.mentors(id),
  attended boolean NOT NULL DEFAULT true,
  rating integer,
  helpful text,
  comments text,
  continue_with_mentor boolean NOT NULL DEFAULT true,
  followup_request text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_feedback TO authenticated;
GRANT ALL ON public.session_feedback TO service_role;
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own session feedback" ON public.session_feedback FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_session_feedback_updated_at BEFORE UPDATE ON public.session_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();