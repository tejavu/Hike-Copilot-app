REVOKE ALL ON public.mentors FROM anon;
REVOKE ALL ON public.mentors FROM authenticated;

GRANT SELECT (
  id, external_id, full_name, title, company, bio, expertise, role_track, seniority,
  languages, city, country, lat, lng, meeting_pref, availability_summary, topics,
  community, years_experience, slots, is_demo, created_at
) ON public.mentors TO authenticated;

GRANT ALL ON public.mentors TO service_role;

DROP POLICY IF EXISTS "Mentor directory is readable" ON public.mentors;
CREATE POLICY "Mentor directory is readable by signed-in users"
  ON public.mentors FOR SELECT TO authenticated USING (true);