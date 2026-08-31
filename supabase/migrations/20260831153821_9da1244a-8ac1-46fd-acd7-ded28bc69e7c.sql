create table public.events (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  title text not null,
  organizer text not null,
  source text not null,
  event_type text not null check (event_type in ('hackathon','workshop','networking','women_program','conference')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  format text not null default 'in_person' check (format in ('in_person','virtual','hybrid')),
  city text,
  country text,
  lat double precision,
  lng double precision,
  cost text not null default 'free' check (cost in ('free','paid')),
  price_text text,
  skill_tags text[] not null default '{}',
  url text not null,
  description text,
  cohort_going integer not null default 0,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.events to anon;
grant select on public.events to authenticated;
grant all on public.events to service_role;

alter table public.events enable row level security;

create policy "Events are readable by everyone"
  on public.events for select
  to anon, authenticated
  using (true);

create index events_starts_at_idx on public.events (starts_at);

create table public.event_engagement (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_id uuid not null references public.events(id) on delete cascade,
  saved boolean not null default false,
  rsvp_status text not null default 'none' check (rsvp_status in ('none','interested','going')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id)
);

grant select, insert, update, delete on public.event_engagement to authenticated;
grant all on public.event_engagement to service_role;

alter table public.event_engagement enable row level security;

create policy "Own engagement select" on public.event_engagement for select to authenticated using (auth.uid() = user_id);
create policy "Own engagement insert" on public.event_engagement for insert to authenticated with check (auth.uid() = user_id);
create policy "Own engagement update" on public.event_engagement for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own engagement delete" on public.event_engagement for delete to authenticated using (auth.uid() = user_id);

create table public.event_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_id uuid not null references public.events(id) on delete cascade,
  attended boolean not null default true,
  contacts text[] not null default '{}',
  takeaway text,
  rating integer check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.event_reflections to authenticated;
grant all on public.event_reflections to service_role;

alter table public.event_reflections enable row level security;

create policy "Own reflections select" on public.event_reflections for select to authenticated using (auth.uid() = user_id);
create policy "Own reflections insert" on public.event_reflections for insert to authenticated with check (auth.uid() = user_id);
create policy "Own reflections update" on public.event_reflections for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own reflections delete" on public.event_reflections for delete to authenticated using (auth.uid() = user_id);

insert into public.events (external_id, title, organizer, source, event_type, starts_at, ends_at, format, city, country, lat, lng, cost, price_text, skill_tags, url, description, cohort_going) values
  ('meetup:zurich-react-evening', 'React Zurich: Patterns that survive production', 'React Zurich', 'Meetup', 'workshop', now() + interval '4 days' + interval '18 hours', now() + interval '4 days' + interval '21 hours', 'in_person', 'Zurich', 'CH', 47.3769, 8.5417, 'free', 'Free', array['React','TypeScript','Testing']::text[], 'https://www.meetup.com/react-zurich/', 'A hands-on evening on component boundaries, data fetching and the state patterns that hold up once a codebase grows. Bring a laptop; pairs welcome.', 6),
  ('wit:women-in-react-workshop', 'Women in React: build & deploy your first dashboard', 'Women Who Code Zurich', 'Women in Tech Community Calendar', 'women_program', now() + interval '11 days' + interval '17 hours', now() + interval '11 days' + interval '21 hours', 'hybrid', 'Zurich', 'CH', 47.3769, 8.5417, 'free', 'Free (donations welcome)', array['React','TypeScript','Accessibility']::text[], 'https://www.womenwhocode.com/', 'Ship something real in one sitting: a filtered dashboard with loading and empty states, reviewed by engineers who do this daily. Beginners genuinely welcome.', 14),
  ('eventbrite:swiss-data-night', 'Swiss Data Night: SQL to storytelling', 'Data Community Switzerland', 'Eventbrite', 'networking', now() + interval '6 days' + interval '18 hours', now() + interval '6 days' + interval '21 hours', 'in_person', 'Zurich', 'CH', 47.3769, 8.5417, 'paid', 'CHF 25', array['SQL','Data Visualisation','Stakeholder communication']::text[], 'https://www.eventbrite.com/', 'Two short talks on turning messy operational data into decisions, then long, unhurried mingling with analysts and data leads.', 9),
  ('devpost:femtech-hack', 'FemTech Hack Europe (48h)', 'FemTech Collective', 'Devpost', 'hackathon', now() + interval '19 days' + interval '9 hours', now() + interval '19 days' + interval '57 hours', 'hybrid', 'Berlin', 'DE', 52.52, 13.405, 'free', 'Free', array['React','Python','Product thinking']::text[], 'https://devpost.com/hackathons', 'Weekend build sprint on women''s health and care tech. Teams form on site, mentors circulate, and every team demos — a portfolio piece in two days.', 21),
  ('meetup:python-basel', 'PyBasel: pandas for people who inherited the spreadsheet', 'PyBasel', 'Meetup', 'workshop', now() + interval '9 days' + interval '18 hours', now() + interval '9 days' + interval '20 hours', 'in_person', 'Basel', 'CH', 47.5596, 7.5886, 'free', 'Free', array['Python','SQL','Data Visualisation']::text[], 'https://www.meetup.com/pybasel/', 'A practical clinic: load ugly CSVs, clean them, and produce one chart you''d actually show a stakeholder.', 4),
  ('linkedin:cloud-fundamentals-live', 'Cloud fundamentals live: your first deploy on AWS', 'Cloud Guild EU', 'LinkedIn Events', 'workshop', now() + interval '3 days' + interval '17 hours', now() + interval '3 days' + interval '19 hours', 'virtual', null, null, null, null, 'free', 'Free', array['Cloud','Docker','AWS']::text[], 'https://www.linkedin.com/events/', 'From empty account to a running container, narrated slowly. Perfect if cloud has always felt like someone else''s job.', 17),
  ('eventbrite:women-in-cloud-summit', 'Women in Cloud Summit', 'Women in Cloud', 'Eventbrite', 'conference', now() + interval '27 days' + interval '9 hours', now() + interval '27 days' + interval '18 hours', 'in_person', 'Amsterdam', 'NL', 52.3676, 4.9041, 'paid', 'EUR 89 (scholarships available)', array['Cloud','AWS','Leadership']::text[], 'https://www.eventbrite.com/', 'A full day of cloud architecture and career talks, with a hiring corner and a scholarship pool for career changers.', 11),
  ('meetup:zurich-ml-reading', 'ML Reading Circle: one paper, plainly explained', 'Zurich ML Circle', 'Meetup', 'networking', now() + interval '8 days' + interval '19 hours', now() + interval '8 days' + interval '21 hours', 'in_person', 'Zurich', 'CH', 47.3769, 8.5417, 'free', 'Free', array['Machine Learning','Python','Statistics']::text[], 'https://www.meetup.com/', 'No maths bravado. One recent paper, explained so a careful beginner follows it, then coffee and questions.', 5),
  ('partner:sponsor-office-hours', 'Sponsor office hours: portfolio reviews with hiring engineers', 'Ada Partner Network', 'Sponsor & Partner Calendar', 'women_program', now() + interval '5 days' + interval '12 hours', now() + interval '5 days' + interval '15 hours', 'virtual', null, null, null, null, 'free', 'Free for members', array['Portfolio','Interviewing','React']::text[], 'https://ada.example.com/office-hours', 'Book a 20-minute slot and have an engineer read your repo like a hiring manager would — then tell you the two things to change.', 8),
  ('eventbrite:product-thinking-lab', 'Product thinking lab for engineers', 'Product Folks Zurich', 'Eventbrite', 'workshop', now() + interval '14 days' + interval '18 hours', now() + interval '14 days' + interval '21 hours', 'in_person', 'Zurich', 'CH', 47.3769, 8.5417, 'paid', 'CHF 40', array['Product thinking','Stakeholder communication']::text[], 'https://www.eventbrite.com/', 'Practise the part of the job nobody teaches: scoping, saying no kindly, and explaining trade-offs to non-engineers.', 3),
  ('meetup:geneva-frontend', 'Geneva Frontend: accessibility from the first commit', 'Geneva Frontend', 'Meetup', 'workshop', now() + interval '16 days' + interval '18 hours', now() + interval '16 days' + interval '20 hours', 'in_person', 'Geneva', 'CH', 46.2044, 6.1432, 'free', 'Free', array['Accessibility','React','Testing']::text[], 'https://www.meetup.com/', 'Screen-reader demos and keyboard-only navigation, then fixing a real component together.', 2),
  ('wit:she-codes-mixer-bern', 'She Codes Bern: after-work mixer', 'She Codes Bern', 'Women in Tech Community Calendar', 'networking', now() + interval '7 days' + interval '18 hours', now() + interval '7 days' + interval '21 hours', 'in_person', 'Bern', 'CH', 46.948, 7.4474, 'free', 'Free', array['Networking','Career change']::text[], 'https://www.womenwhocode.com/', 'No talks, no badges — just women in tech at every stage, a long table, and permission to ask beginner questions out loud.', 12),
  ('devpost:open-data-hack-lausanne', 'Open Data Hack Lausanne', 'EPFL Open Data', 'Devpost', 'hackathon', now() + interval '24 days' + interval '10 hours', now() + interval '24 days' + interval '40 hours', 'in_person', 'Lausanne', 'CH', 46.5197, 6.6323, 'free', 'Free (meals included)', array['Python','SQL','Data Visualisation']::text[], 'https://devpost.com/hackathons', 'Public transport and climate datasets, friendly mentors, and a demo slot that makes a lovely portfolio entry.', 7),
  ('linkedin:interview-clinic', 'Technical interview clinic: think out loud without panic', 'Careers in Code', 'LinkedIn Events', 'workshop', now() + interval '2 days' + interval '17 hours', now() + interval '2 days' + interval '19 hours', 'virtual', null, null, null, null, 'free', 'Free', array['Interviewing','Algorithms','Communication']::text[], 'https://www.linkedin.com/events/', 'Two mock interviews performed live, including a wrong turn and a recovery — so you see that stumbling is survivable.', 19),
  ('eventbrite:women-in-data-conf', 'Women in Data Conference', 'Women in Data EU', 'Eventbrite', 'conference', now() + interval '33 days' + interval '9 hours', now() + interval '33 days' + interval '17 hours', 'hybrid', 'Munich', 'DE', 48.1351, 11.582, 'paid', 'EUR 120 (early bird EUR 75)', array['SQL','Python','Machine Learning','Data Visualisation']::text[], 'https://www.eventbrite.com/', 'Analytics, ML in production, and a candid track on switching into data from another career entirely.', 15),
  ('meetup:docker-k8s-evening', 'Containers, calmly: Docker and a first Kubernetes deploy', 'Cloud Native Zurich', 'Meetup', 'workshop', now() + interval '13 days' + interval '18 hours', now() + interval '13 days' + interval '21 hours', 'in_person', 'Zurich', 'CH', 47.3769, 8.5417, 'free', 'Free', array['Docker','Cloud','DevOps']::text[], 'https://www.meetup.com/', 'Build an image, break it, fix it, deploy it. Ideal before a cloud certification attempt.', 6),
  ('partner:cv-and-linkedin-lab', 'Swiss CV & LinkedIn lab', 'Ada Partner Network', 'Sponsor & Partner Calendar', 'women_program', now() + interval '10 days' + interval '12 hours', now() + interval '10 days' + interval '14 hours', 'virtual', null, null, null, null, 'free', 'Free for members', array['Portfolio','Networking','Career change']::text[], 'https://ada.example.com/cv-lab', 'Bring the CV you already have. We rework it to Swiss conventions live, then tidy your LinkedIn headline together.', 10),
  ('meetup:testing-guild', 'Testing Guild: from zero tests to a suite you trust', 'Testing Guild EU', 'Meetup', 'workshop', now() + interval '21 days' + interval '17 hours', now() + interval '21 days' + interval '19 hours', 'virtual', null, null, null, null, 'free', 'Free', array['Testing','TypeScript','React']::text[], 'https://www.meetup.com/', 'Where to put your first three tests so they catch real bugs instead of ceremony.', 5),
  ('eventbrite:london-women-tech-mixer', 'Women in Tech London: hiring mixer', 'Tech Women London', 'Eventbrite', 'networking', now() + interval '18 days' + interval '18 hours', now() + interval '18 days' + interval '21 hours', 'in_person', 'London', 'GB', 51.5072, -0.1276, 'paid', 'GBP 15', array['Networking','Interviewing','React']::text[], 'https://www.eventbrite.co.uk/', 'Small-group conversations with engineers from teams actively hiring — no CV drop, just talking.', 13),
  ('devpost:ai-for-good-sprint', 'AI for Good weekend sprint', 'AI for Good Lab', 'Devpost', 'hackathon', now() + interval '30 days' + interval '9 hours', now() + interval '30 days' + interval '45 hours', 'virtual', null, null, null, null, 'free', 'Free', array['Python','Machine Learning','Cloud']::text[], 'https://devpost.com/hackathons', 'Remote teams, NGO briefs, and mentors on call. First-time hackers get paired deliberately, not left to fend.', 16),
  ('wit:mums-in-tech-returners', 'Returners circle: back into tech after a break', 'Mums in Tech CH', 'Women in Tech Community Calendar', 'women_program', now() + interval '12 days' + interval '10 hours', now() + interval '12 days' + interval '12 hours', 'hybrid', 'Zurich', 'CH', 47.3769, 8.5417, 'free', 'Free', array['Career change','Networking','Interviewing']::text[], 'https://www.womenwhocode.com/', 'A gentle, practical circle on returning after time out: how to frame the gap, and who is genuinely welcoming.', 9),
  ('meetup:sql-clinic-online', 'SQL clinic: window functions without fear', 'SQL Study Group', 'Meetup', 'workshop', now() + interval '1 days' + interval '18 hours', now() + interval '1 days' + interval '20 hours', 'virtual', null, null, null, null, 'free', 'Free', array['SQL','Data Visualisation']::text[], 'https://www.meetup.com/', 'One query, built up line by line, until window functions stop looking like hieroglyphs.', 8),
  ('linkedin:public-speaking-tech', 'Speaking up: your first tech talk', 'Speak Easy Tech', 'LinkedIn Events', 'women_program', now() + interval '23 days' + interval '17 hours', now() + interval '23 days' + interval '19 hours', 'virtual', null, null, null, null, 'free', 'Free', array['Communication','Networking','Portfolio']::text[], 'https://www.linkedin.com/events/', 'Draft a five-minute talk from something you already built, and practise it once in a room that is on your side.', 11),
  ('eventbrite:zurich-tech-careers-fair', 'Zurich Tech Careers Fair', 'Swiss Tech Careers', 'Eventbrite', 'conference', now() + interval '36 days' + interval '10 hours', now() + interval '36 days' + interval '17 hours', 'in_person', 'Zurich', 'CH', 47.3769, 8.5417, 'free', 'Free with registration', array['Interviewing','Networking','React','SQL']::text[], 'https://www.eventbrite.com/', 'Forty teams hiring in Switzerland, plus a quiet room and a CV desk if the hall gets loud.', 20),
  ('meetup:amsterdam-node-api', 'APIs that age well: Node & Postgres evening', 'Amsterdam Backend', 'Meetup', 'workshop', now() + interval '20 days' + interval '18 hours', now() + interval '20 days' + interval '21 hours', 'in_person', 'Amsterdam', 'NL', 52.3676, 4.9041, 'free', 'Free', array['SQL','TypeScript','APIs']::text[], 'https://www.meetup.com/', 'Design an endpoint together, argue about pagination, leave with a pattern you can reuse.', 4),
  ('partner:mock-interview-marathon', 'Mock interview marathon (women-only cohort)', 'Ada Partner Network', 'Sponsor & Partner Calendar', 'women_program', now() + interval '26 days' + interval '9 hours', now() + interval '26 days' + interval '15 hours', 'virtual', null, null, null, null, 'free', 'Free for members', array['Interviewing','Algorithms','Communication']::text[], 'https://ada.example.com/mock-interviews', 'Three interviews, three kinds of feedback, one day. You leave with notes instead of a vague bad feeling.', 14),
  ('meetup:munich-react-native', 'Munich React: performance profiling live', 'React Munich', 'Meetup', 'workshop', now() + interval '29 days' + interval '18 hours', now() + interval '29 days' + interval '20 hours', 'in_person', 'Munich', 'DE', 48.1351, 11.582, 'free', 'Free', array['React','TypeScript','Testing']::text[], 'https://www.meetup.com/', 'Profile a slow list on stage, find the re-render, fix it. Concrete and oddly satisfying.', 3),
  ('eventbrite:geneva-cloud-cert-bootcamp', 'Cloud certification bootcamp (AWS SAA)', 'Alpine Cloud Academy', 'Eventbrite', 'workshop', now() + interval '31 days' + interval '9 hours', now() + interval '31 days' + interval '17 hours', 'hybrid', 'Geneva', 'CH', 46.2044, 6.1432, 'paid', 'CHF 190', array['Cloud','AWS','Docker']::text[], 'https://www.eventbrite.com/', 'A structured run at the exam blueprint, with practice questions and a study plan to take home.', 6),
  ('wit:coffee-pairs-virtual', 'Virtual coffee pairs: 30 minutes, one new person', 'Women in Tech CH', 'Women in Tech Community Calendar', 'networking', now() + interval '5 days' + interval '8 hours', now() + interval '5 days' + interval '9 hours', 'virtual', null, null, null, null, 'free', 'Free', array['Networking','Career change']::text[], 'https://www.womenwhocode.com/', 'You get matched with one woman in tech and a prompt to start from. The lowest-effort way to grow a network.', 18),
  ('devpost:swiss-fintech-hack', 'Swiss FinTech Hack', 'FinTech Hub CH', 'Devpost', 'hackathon', now() + interval '40 days' + interval '9 hours', now() + interval '40 days' + interval '57 hours', 'in_person', 'Zurich', 'CH', 47.3769, 8.5417, 'free', 'Free', array['Python','SQL','APIs','Product thinking']::text[], 'https://devpost.com/hackathons', 'Banking APIs, sandbox data, and judges who care more about the demo than the pitch deck.', 8),
  ('meetup:zurich-react-evening-2', 'React Zurich: state management showdown', 'React Zurich', 'Meetup', 'networking', now() + interval '45 days' + interval '18 hours', now() + interval '45 days' + interval '21 hours', 'in_person', 'Zurich', 'CH', 47.3769, 8.5417, 'free', 'Free', array['React','TypeScript','Product thinking']::text[], 'https://www.meetup.com/react-zurich/', 'Three approaches, three opinionated demos, then pizza and honest debate about what you should actually pick.', 5);