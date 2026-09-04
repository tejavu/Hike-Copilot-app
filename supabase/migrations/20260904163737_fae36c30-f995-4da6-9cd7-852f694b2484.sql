alter table public.mentor_matches
  add column if not exists request_email_status text,
  add column if not exists request_email_detail text;