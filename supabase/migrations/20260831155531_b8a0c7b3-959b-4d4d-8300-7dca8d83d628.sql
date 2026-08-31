-- Mentor Match: mentor directory, needs assessment, matches, sessions, actions.

create table public.mentors (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  full_name text not null,
  title text not null,
  company text not null,
  bio text not null,
  expertise text[] not null default '{}',
  role_track text not null,
  seniority text not null,
  languages text[] not null default '{}',
  city text,
  country text,
  lat double precision,
  lng double precision,
  meeting_pref text not null default 'either',
  availability_summary text not null default '',
  topics text[] not null default '{}',
  community text,
  years_experience integer not null default 0,
  slots jsonb not null default '[]'::jsonb,
  is_demo boolean not null default true,
  created_at timestamptz not null default now()
);

grant select on public.mentors to anon;
grant select on public.mentors to authenticated;
grant all on public.mentors to service_role;
alter table public.mentors enable row level security;
create policy "Mentor directory is readable" on public.mentors for select using (true);

create table public.mentor_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal text,
  target_role text,
  priority_skills text[] not null default '{}',
  guidance_style text,
  language text,
  location_pref text not null default 'either',
  availability_notes text,
  session_focus text,
  reminder_cadence text not null default 'monthly',
  next_check_in_at timestamptz,
  reminder_pending boolean not null default false,
  selected_mentor_id uuid references public.mentors(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.mentor_preferences to authenticated;
grant all on public.mentor_preferences to service_role;
alter table public.mentor_preferences enable row level security;
create policy "Own mentor preferences" on public.mentor_preferences
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.mentor_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mentor_id uuid not null references public.mentors(id) on delete cascade,
  score integer not null default 0,
  reasons text[] not null default '{}',
  matched_attributes text[] not null default '{}',
  status text not null default 'suggested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mentor_id)
);

grant select, insert, update, delete on public.mentor_matches to authenticated;
grant all on public.mentor_matches to service_role;
alter table public.mentor_matches enable row level security;
create policy "Own mentor matches" on public.mentor_matches
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.mentor_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mentor_id uuid not null references public.mentors(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  theme text not null default '',
  agenda text,
  prep_questions text[] not null default '{}',
  status text not null default 'scheduled',
  recap text,
  key_advice text,
  recap_source text not null default 'manual',
  next_check_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.mentor_sessions to authenticated;
grant all on public.mentor_sessions to service_role;
alter table public.mentor_sessions enable row level security;
create policy "Own mentor sessions" on public.mentor_sessions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.mentor_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.mentor_sessions(id) on delete cascade,
  mentor_id uuid references public.mentors(id) on delete set null,
  title text not null,
  detail text,
  done boolean not null default false,
  due_date date,
  roadmap_item_id uuid references public.roadmap_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.mentor_actions to authenticated;
grant all on public.mentor_actions to service_role;
alter table public.mentor_actions enable row level security;
create policy "Own mentor actions" on public.mentor_actions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index mentor_matches_user_idx on public.mentor_matches (user_id, score desc);
create index mentor_sessions_user_idx on public.mentor_sessions (user_id, starts_at);
create index mentor_actions_user_idx on public.mentor_actions (user_id, created_at desc);

-- Seeded demo mentor directory (transparent demo profiles, is_demo defaults true).
insert into public.mentors (
  external_id, full_name, title, company, bio, expertise, role_track, seniority,
  languages, city, country, lat, lng, meeting_pref, availability_summary, topics,
  community, years_experience, slots
) values
  ('demo:mentor-lea-brunner', 'Lea Brunner', 'Staff Frontend Engineer', 'Swisscom', 'Started in graphic design, retrained into frontend at 29, and now leads the design-system guild. I know exactly what it feels like to be the least technical person in the room and to grow out of that.', ARRAY['React','TypeScript','Design Systems','Accessibility','CSS']::text[], 'Frontend Engineering', 'Staff', ARRAY['German','English']::text[], 'Zurich', 'CH', 47.3769, 8.5417, 'either', 'Tuesday and Thursday evenings, 45–60 min', ARRAY['Career switching','Portfolio review','Frontend interviews','Imposter feelings']::text[], 'Women in Tech Switzerland', 11, '[{"dow":2,"hour":18,"minutes":45},{"dow":4,"hour":19,"minutes":60}]'::jsonb),
  ('demo:mentor-nadia-haddad', 'Nadia Haddad', 'Senior Data Scientist', 'Roche', 'I came from biology, taught myself Python on the night shift, and now build models in a regulated environment. Ask me about learning stats without a maths degree and about being taken seriously in review meetings.', ARRAY['Python','Machine Learning','SQL','Statistics','Data Visualization']::text[], 'Data Science', 'Senior', ARRAY['French','English','Arabic']::text[], 'Basel', 'CH', 47.5596, 7.5886, 'either', 'Wednesday lunchtimes and Saturday mornings', ARRAY['Breaking into data','Portfolio projects','Technical storytelling','Salary talks']::text[], 'PyLadies Basel', 8, '[{"dow":3,"hour":12,"minutes":45},{"dow":6,"hour":10,"minutes":60}]'::jsonb),
  ('demo:mentor-priya-raman', 'Priya Raman', 'Engineering Manager', 'Google', 'Twelve years shipping backend systems, five of them managing. I mentor women who are being told they are ''not quite ready'' — usually they are, and we build the evidence together.', ARRAY['Leadership','System Design','Go','Kubernetes','Career Growth']::text[], 'Engineering Leadership', 'Manager', ARRAY['English','Hindi']::text[], 'Zurich', 'CH', 47.3769, 8.5417, 'remote', 'Monday mornings, 30 min focused calls', ARRAY['Promotion cases','Negotiation','Managing up','Interview strategy']::text[], 'Lean In Circles Zurich', 12, '[{"dow":1,"hour":8,"minutes":30},{"dow":1,"hour":9,"minutes":30}]'::jsonb),
  ('demo:mentor-sofia-marchetti', 'Sofia Marchetti', 'Cloud Platform Engineer', 'Zühlke', 'Consultant turned platform engineer. I spend my days in AWS, Terraform and CI pipelines, and my evenings convincing career switchers that infrastructure is learnable in public.', ARRAY['AWS','Terraform','Docker','CI/CD','Cloud Architecture']::text[], 'Cloud & DevOps', 'Senior', ARRAY['Italian','German','English']::text[], 'Lugano', 'CH', 46.0037, 8.9511, 'remote', 'Thursday evenings, fortnightly', ARRAY['Cloud certifications','Homelab projects','First DevOps role']::text[], 'Cloud Native Switzerland', 9, '[{"dow":4,"hour":18,"minutes":60},{"dow":2,"hour":20,"minutes":45}]'::jsonb),
  ('demo:mentor-mira-okonkwo', 'Mira Okonkwo', 'Product Manager', 'Revolut', 'I moved from customer support to product in three years by writing down everything I noticed. If you are trying to prove product instincts without a product title yet, that is my favourite problem.', ARRAY['Product Management','User Research','Analytics','Roadmapping','SQL']::text[], 'Product', 'Mid-senior', ARRAY['English']::text[], 'London', 'GB', 51.5072, -0.1276, 'remote', 'Friday afternoons, 45 min', ARRAY['Into product without a PM title','Case interviews','Stakeholder pushback']::text[], 'Women in Product', 7, '[{"dow":5,"hour":15,"minutes":45},{"dow":5,"hour":16,"minutes":45}]'::jsonb),
  ('demo:mentor-anouk-devries', 'Anouk de Vries', 'Backend Engineer', 'Adyen', 'Bootcamp graduate in 2019, now on a payments core team. I remember every stage of the ''am I actually an engineer yet'' spiral and I will walk you through yours honestly.', ARRAY['Java','Python','APIs','Databases','Testing']::text[], 'Backend Engineering', 'Mid', ARRAY['Dutch','English']::text[], 'Amsterdam', 'NL', 52.3676, 4.9041, 'remote', 'Tuesday evenings, weekly', ARRAY['Junior job search','Code review nerves','Bootcamp to first role']::text[], 'Codam Alumni', 6, '[{"dow":2,"hour":19,"minutes":45},{"dow":3,"hour":19,"minutes":45}]'::jsonb),
  ('demo:mentor-yara-fischer', 'Yara Fischer', 'UX Engineer', 'On Running', 'I sit between design and code, which means I have opinions about both. Bring me a portfolio, a half-built project or a job ad you feel unqualified for.', ARRAY['React','Figma','Accessibility','Design Systems','Prototyping']::text[], 'Design Engineering', 'Senior', ARRAY['German','English']::text[], 'Zurich', 'CH', 47.3769, 8.5417, 'in_person', 'Wednesday after work, coffee in Zurich', ARRAY['Portfolio review','Design-to-code','Freelance to employed']::text[], 'Ladies that UX Zurich', 8, '[{"dow":3,"hour":17,"minutes":60},{"dow":3,"hour":18,"minutes":60}]'::jsonb),
  ('demo:mentor-tessa-lindqvist', 'Tessa Lindqvist', 'Security Engineer', 'Proton', 'Former sysadmin, now application security. I mentor women entering security who worry they are ''not hacker enough'' — the job is mostly patience and good questions.', ARRAY['Security','Linux','Python','Threat Modeling','Cryptography']::text[], 'Security', 'Senior', ARRAY['Swedish','English','German']::text[], 'Geneva', 'CH', 46.2044, 6.1432, 'remote', 'Monday evenings, monthly deep dives', ARRAY['Into security','Certifications worth it','CTFs without fear']::text[], 'OWASP Geneva', 10, '[{"dow":1,"hour":19,"minutes":60},{"dow":1,"hour":20,"minutes":45}]'::jsonb),
  ('demo:mentor-ines-moreau', 'Inès Moreau', 'Data Engineer', 'Nestlé', 'Pipelines, warehouses and the unglamorous glue that makes analytics real. I came from finance reporting, so I am fluent in ''my current job is not technical enough''.', ARRAY['SQL','Python','dbt','Airflow','Data Modeling']::text[], 'Data Engineering', 'Senior', ARRAY['French','English']::text[], 'Lausanne', 'CH', 46.5197, 6.6323, 'either', 'Thursday lunchtimes, 30 min check-ins', ARRAY['Analytics to engineering','Learning plans','Interview take-homes']::text[], 'Women in Data Romandie', 9, '[{"dow":4,"hour":12,"minutes":30},{"dow":4,"hour":13,"minutes":30}]'::jsonb),
  ('demo:mentor-ruth-abebe', 'Ruth Abebe', 'QA Lead', 'SIX Group', 'Testing taught me systems thinking better than any course. I help people turn ''detail-oriented'' into a technical career, and I am blunt about what teams actually reward.', ARRAY['Test Automation','Playwright','TypeScript','Quality Strategy']::text[], 'Quality Engineering', 'Lead', ARRAY['English','German']::text[], 'Zurich', 'CH', 47.3769, 8.5417, 'either', 'Tuesday mornings before standup', ARRAY['QA to SDET','Automation portfolio','Returning after a break']::text[], 'Women in Tech Switzerland', 13, '[{"dow":2,"hour":8,"minutes":30},{"dow":5,"hour":8,"minutes":45}]'::jsonb),
  ('demo:mentor-clara-vogel', 'Clara Vogel', 'AI Engineer', 'DeepJudge', 'Small startup, large models. I went from research assistant to shipping LLM features and I will happily tell you which parts of the hype are worth your evenings.', ARRAY['Python','Machine Learning','LLMs','APIs','Prompt Engineering']::text[], 'AI / ML Engineering', 'Mid-senior', ARRAY['German','English']::text[], 'Zurich', 'CH', 47.3769, 8.5417, 'remote', 'Sunday evenings, fortnightly', ARRAY['AI projects that impress','Startup vs corporate','Research to industry']::text[], 'Zurich ML Meetup', 5, '[{"dow":0,"hour":18,"minutes":45},{"dow":0,"hour":19,"minutes":45}]'::jsonb),
  ('demo:mentor-elif-kaya', 'Elif Kaya', 'Technical Program Manager', 'Microsoft', 'I organise engineering chaos for a living and I coach on visibility: how to make your work legible to the people who decide about your career. Also a Teams power user, for better or worse.', ARRAY['Program Management','Stakeholder Management','Agile','Communication']::text[], 'Program Management', 'Senior', ARRAY['Turkish','English','German']::text[], 'Munich', 'DE', 48.1351, 11.582, 'remote', 'Friday mornings, 30 min', ARRAY['Visibility at work','Performance reviews','Non-coding tech careers']::text[], 'Microsoft Women''s Network', 11, '[{"dow":5,"hour":9,"minutes":30},{"dow":5,"hour":10,"minutes":30}]'::jsonb);