-- =====================================================================
-- SafeX Intern Management Portal — database schema
-- Run this once against a fresh Supabase project (SQL Editor, or via
-- `supabase db push` / psql). Safe to re-run: guarded with IF NOT EXISTS
-- / DROP ... IF EXISTS where it matters.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 2. Core tables
-- ---------------------------------------------------------------------

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  leader_id   uuid unique, -- FK to profiles(id) added below, once that table exists
  created_at  timestamptz not null default now()
);

-- profiles mirrors auth.users 1:1. Created automatically by the
-- handle_new_user trigger below whenever an admin provisions an account
-- through supabase.auth.admin.createUser(). There is no client-side path
-- that inserts into this table.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  email      text not null unique,
  role       text not null check (role in ('admin', 'leader', 'intern')),
  group_id   uuid references public.groups(id) on delete set null,
  status     text not null default 'active' check (status in ('active', 'disabled')),
  force_password_change boolean not null default true,
  created_at timestamptz not null default now()
);

-- groups.leader_id references profiles, which is created after groups —
-- add the FK now that both tables exist (no-op if already applied).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'groups_leader_id_fkey'
  ) then
    alter table public.groups
      add constraint groups_leader_id_fkey
      foreign key (leader_id) references public.profiles(id) on delete set null;
  end if;
end $$;

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups(id) on delete cascade,
  assignee_id uuid not null references public.profiles(id) on delete cascade,
  created_by  uuid not null references public.profiles(id),
  title       text not null,
  description text not null default '',
  deadline    date,
  status      text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  progress    int  not null default 0 check (progress between 0 and 100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.task_notes (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  author_id  uuid not null references public.profiles(id),
  body       text not null,
  created_at timestamptz not null default now()
);

-- Feedback is intentionally structural-anonymous: there is no author
-- column, and none is ever added. Nothing in this table can be traced
-- back to an intern, even by an admin with full table access.
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  rating     int not null check (rating between 1 and 5),
  comment    text not null default '',
  created_at timestamptz not null default now()
);

-- feedback_weeks exists ONLY to rate-limit "one submission per intern per
-- week." It is never exposed through any RLS policy — it is written to
-- and read from exclusively inside the SECURITY DEFINER functions below,
-- so no API role (including admin) can query it through the normal
-- client. This keeps the rate-limit enforceable without weakening the
-- anonymity guarantee on the feedback table itself.
create table if not exists public.feedback_weeks (
  intern_id  uuid not null references public.profiles(id) on delete cascade,
  group_id   uuid not null references public.groups(id) on delete cascade,
  week_start date not null,
  created_at timestamptz not null default now(),
  primary key (intern_id, week_start)
);

create index if not exists idx_profiles_group_id on public.profiles(group_id);
create index if not exists idx_tasks_group_id on public.tasks(group_id);
create index if not exists idx_tasks_assignee_id on public.tasks(assignee_id);
create index if not exists idx_task_notes_task_id on public.task_notes(task_id);
create index if not exists idx_feedback_group_id on public.feedback(group_id);

-- ---------------------------------------------------------------------
-- 3. Helper functions (SECURITY DEFINER so RLS policies on `profiles`
--    don't recurse into themselves when checking the caller's own role)
-- ---------------------------------------------------------------------

create or replace function public.current_profile_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_profile_group()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select group_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'admin', false);
$$;

-- ---------------------------------------------------------------------
-- 4. New-user provisioning trigger
--    Admin creates a user via supabase.auth.admin.createUser({... ,
--    user_metadata: { full_name, role, group_id } }). This trigger reads
--    that metadata and creates the matching profiles row automatically.
--    No client code ever inserts into `profiles` directly.
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, group_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'intern'),
    nullif(new.raw_user_meta_data ->> 'group_id', '')::uuid
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 5. Leader assignment (atomic, replaces any previous leader)
-- ---------------------------------------------------------------------

create or replace function public.assign_group_leader(p_group_id uuid, p_leader_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_leader uuid;
begin
  -- Allow: (a) service-role calls (auth.uid() is null), or (b) an
  -- authenticated admin. Anyone else is rejected.
  if auth.uid() is not null and public.current_profile_role() <> 'admin' then
    raise exception 'Only admins can assign group leaders';
  end if;

  select leader_id into v_old_leader from public.groups where id = p_group_id;

  -- If p_leader_id currently leads a *different* group, free that slot
  -- first so the unique constraint on groups.leader_id never conflicts.
  update public.groups set leader_id = null where leader_id = p_leader_id and id <> p_group_id;

  -- The group's previous leader (if being replaced) is unassigned from
  -- the group rather than left dangling.
  if v_old_leader is not null and v_old_leader <> p_leader_id then
    update public.profiles set group_id = null where id = v_old_leader and role = 'leader';
  end if;

  update public.groups set leader_id = p_leader_id where id = p_group_id;
  update public.profiles set group_id = p_group_id, role = 'leader' where id = p_leader_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Anonymous feedback (SECURITY DEFINER; the only write path)
-- ---------------------------------------------------------------------

create or replace function public.submit_feedback(p_group_id uuid, p_rating int, p_comment text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week date := date_trunc('week', now())::date;
begin
  if public.current_profile_role() <> 'intern' then
    raise exception 'Only interns can submit weekly feedback';
  end if;

  if public.current_profile_group() is distinct from p_group_id then
    raise exception 'You can only submit feedback for your own group';
  end if;

  if p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  -- Enforces one submission per intern per week WITHOUT ever linking the
  -- feedback row itself to an intern.
  insert into public.feedback_weeks (intern_id, group_id, week_start)
  values (auth.uid(), p_group_id, v_week);

  insert into public.feedback (group_id, rating, comment)
  values (p_group_id, greatest(1, least(5, p_rating)), coalesce(trim(p_comment), ''));
exception
  when unique_violation then
    raise exception 'You already submitted feedback for this group this week';
end;
$$;

create or replace function public.has_submitted_feedback_this_week(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.feedback_weeks
    where intern_id = auth.uid()
      and group_id = p_group_id
      and week_start = date_trunc('week', now())::date
  );
$$;

-- ---------------------------------------------------------------------
-- 6b. Let a user clear their own forced-password-change flag after they
--     set a new password — without granting a general self-update
--     policy on profiles (which stays admin-only; see profiles_update).
-- ---------------------------------------------------------------------

create or replace function public.mark_password_changed()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set force_password_change = false where id = auth.uid();
$$;

grant execute on function public.mark_password_changed() to authenticated;

-- ---------------------------------------------------------------------
-- 7. Column-level lock-down for interns editing tasks
--    RLS can allow/deny a whole row but not individual columns, so an
--    intern's UPDATE is allowed at the row level (their own task) and
--    then this trigger rejects the statement if any field besides
--    status / progress / updated_at actually changed.
-- ---------------------------------------------------------------------

create or replace function public.enforce_task_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() = 'intern' then
    if new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.deadline is distinct from old.deadline
      or new.assignee_id is distinct from old.assignee_id
      or new.group_id is distinct from old.group_id
      or new.created_by is distinct from old.created_by
    then
      raise exception 'Interns may only update status and progress on their own tasks';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_enforce_task_update_scope on public.tasks;
create trigger trg_enforce_task_update_scope
  before update on public.tasks
  for each row execute function public.enforce_task_update_scope();

-- ---------------------------------------------------------------------
-- 8. Row Level Security
-- ---------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.tasks enable row level security;
alter table public.task_notes enable row level security;
alter table public.feedback enable row level security;
alter table public.feedback_weeks enable row level security; -- no policies => no client access at all

-- profiles -------------------------------------------------------------

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select
  using (
    public.is_admin()
    or id = auth.uid()
    or (public.current_profile_role() = 'leader' and group_id = public.current_profile_group())
  );

-- No INSERT policy: profile rows are only ever created by the
-- handle_new_user trigger (which runs as SECURITY DEFINER and therefore
-- bypasses RLS), itself only reachable when an admin calls
-- supabase.auth.admin.createUser from a server-side route using the
-- service role key. Regular clients cannot insert into profiles.

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete
  using (public.is_admin());

-- groups -----------------------------------------------------------------

drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups
  for select
  using (
    public.is_admin()
    or id = public.current_profile_group()
  );

drop policy if exists groups_insert on public.groups;
create policy groups_insert on public.groups
  for insert
  with check (public.is_admin());

drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups
  for delete
  using (public.is_admin());

-- tasks --------------------------------------------------------------------

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select
  using (
    public.is_admin()
    or (public.current_profile_role() = 'leader' and group_id = public.current_profile_group())
    or assignee_id = auth.uid()
  );

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert
  with check (
    public.is_admin()
    or (
      public.current_profile_role() = 'leader'
      and group_id = public.current_profile_group()
      and created_by = auth.uid()
      and exists (
        select 1 from public.profiles p
        where p.id = assignee_id
          and p.role = 'intern'
          and p.group_id = public.current_profile_group()
      )
    )
  );

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update
  using (
    public.is_admin()
    or (public.current_profile_role() = 'leader' and group_id = public.current_profile_group())
    or assignee_id = auth.uid()
  )
  with check (
    public.is_admin()
    or (public.current_profile_role() = 'leader' and group_id = public.current_profile_group())
    or assignee_id = auth.uid()
  );
  -- Column-level restriction for interns is enforced by the
  -- trg_enforce_task_update_scope trigger above, not by this policy.

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete
  using (
    public.is_admin()
    or (public.current_profile_role() = 'leader' and group_id = public.current_profile_group())
  );

-- task_notes -----------------------------------------------------------------

drop policy if exists task_notes_select on public.task_notes;
create policy task_notes_select on public.task_notes
  for select
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          public.is_admin()
          or (public.current_profile_role() = 'leader' and t.group_id = public.current_profile_group())
          or t.assignee_id = auth.uid()
        )
    )
  );

drop policy if exists task_notes_insert on public.task_notes;
create policy task_notes_insert on public.task_notes
  for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          public.is_admin()
          or (public.current_profile_role() = 'leader' and t.group_id = public.current_profile_group())
          or t.assignee_id = auth.uid()
        )
    )
  );

-- No update/delete policies: notes form an immutable audit thread.

-- feedback -----------------------------------------------------------------

drop policy if exists feedback_select on public.feedback;
create policy feedback_select on public.feedback
  for select
  using (
    public.is_admin()
    or (public.current_profile_role() = 'leader' and group_id = public.current_profile_group())
  );

-- No insert/update/delete policies on `feedback` for any client role.
-- The only write path is public.submit_feedback(), a SECURITY DEFINER
-- function that bypasses RLS after checking the caller's role itself.

-- ---------------------------------------------------------------------
-- 9. Grants
--    RLS above is the real gate; these grants just allow the
--    authenticated role to reach the tables/functions at all.
-- ---------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select on public.profiles, public.groups, public.tasks, public.task_notes, public.feedback to authenticated;
grant insert on public.tasks, public.task_notes to authenticated;
grant update on public.tasks to authenticated;
grant delete on public.tasks to authenticated;
grant execute on function public.submit_feedback(uuid, int, text) to authenticated;
grant execute on function public.has_submitted_feedback_this_week(uuid) to authenticated;
grant execute on function public.assign_group_leader(uuid, uuid) to authenticated; -- still gated by is_admin() inside

-- feedback_weeks: intentionally NOT granted to authenticated at all.
