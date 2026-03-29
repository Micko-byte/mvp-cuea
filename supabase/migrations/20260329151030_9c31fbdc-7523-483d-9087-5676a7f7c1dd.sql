
create table public.teach_me_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  thread_id text not null,
  unit_name text not null,
  topic_outline jsonb not null default '[]'::jsonb,
  current_topic_index integer not null default 0,
  completed_topics jsonb not null default '[]'::jsonb,
  eli5_triggers integer not null default 0,
  checkpoint_scores jsonb not null default '[]'::jsonb,
  focus_mode boolean not null default false,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.teach_me_sessions enable row level security;

create policy "Users own their sessions"
  on public.teach_me_sessions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
