-- Extensions
create extension if not exists "uuid-ossp";

-- Tables
create table user_info (
  id                 bigint generated always as identity primary key,
  user_id            uuid references auth.users(id) not null unique,
  spine              jsonb,
  focus_1            jsonb,
  focus_2            jsonb,
  focus_3            jsonb,
  weekly_focus       jsonb,
  weekly_goal_hours  integer default 3
);

create table session_logs (
  id                 bigint generated always as identity primary key,
  user_id            uuid references auth.users(id) not null,
  date               date not null,
  week               integer,
  year               integer,
  todays_focus       text,
  exercises_finished jsonb,
  additional_notes   jsonb,
  completed          boolean default false,
  unique (user_id, date)
);

create table weekly_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) not null,
  week_num   integer,
  year       integer,
  focus_info jsonb
);

-- RLS
alter table user_info    enable row level security;
alter table session_logs enable row level security;
alter table weekly_logs  enable row level security;

create policy "own config"      on user_info    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sessions"    on session_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own weekly logs" on weekly_logs  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('session-audio', 'session-audio', true)
on conflict do nothing;

create policy "own audio upload" on storage.objects for insert
  with check (bucket_id = 'session-audio' and auth.uid()::text = (string_to_array(name, '/'))[1]);
create policy "own audio read" on storage.objects for select
  using (bucket_id = 'session-audio' and auth.uid()::text = (string_to_array(name, '/'))[1]);
create policy "own audio update" on storage.objects for update
  using (bucket_id = 'session-audio' and auth.uid()::text = (string_to_array(name, '/'))[1]);
create policy "own audio delete" on storage.objects for delete
  using (bucket_id = 'session-audio' and auth.uid()::text = (string_to_array(name, '/'))[1]);

-- delete_account function
create or replace function delete_account()
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  delete from session_logs where user_id = uid;
  delete from weekly_logs  where user_id = uid;
  delete from user_info    where user_id = uid;
  delete from auth.users   where id = uid;
end;
$$;
