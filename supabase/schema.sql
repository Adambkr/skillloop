-- SkillLoop phase-zero schema. Run in a new Supabase project's SQL editor.
create extension if not exists "pgcrypto";

-- Enum types are created idempotently so the schema can be re-run safely.
-- Postgres has no "create type if not exists", so each is guarded against duplicate_object.
do $$ begin create type public.skill_level as enum ('curious', 'beginner', 'intermediate', 'advanced', 'expert'); exception when duplicate_object then null; end $$;
do $$ begin create type public.request_status as enum ('pending', 'accepted', 'declined', 'cancelled', 'completed', 'disputed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.request_type as enum ('direct_swap', 'credit_session', 'quick_help', 'project_review', 'learning_partner'); exception when duplicate_object then null; end $$;
do $$ begin create type public.session_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled', 'disputed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.message_type as enum ('text', 'system'); exception when duplicate_object then null; end $$;
do $$ begin create type public.circle_post_type as enum ('question', 'help_request', 'resource', 'progress_update', 'project_feedback'); exception when duplicate_object then null; end $$;
do $$ begin create type public.transaction_kind as enum ('earned', 'spent', 'bonus', 'refund', 'adjustment'); exception when duplicate_object then null; end $$;
do $$ begin create type public.credit_transaction_status as enum ('pending', 'completed', 'refunded', 'cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.account_role as enum ('member', 'admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.account_status as enum ('active', 'suspended'); exception when duplicate_object then null; end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  username text unique,
  referral_code text unique,
  referred_by uuid references public.profiles(id) on delete set null,
  activated_at timestamptz,
  headline text,
  bio text,
  avatar_url text,
  languages text[] not null default array['English']::text[],
  timezone text not null default 'UTC',
  availability jsonb not null default '{}'::jsonb,
  reputation_score numeric(4,2) not null default 0 check (reputation_score between 0 and 5),
  response_rate numeric(5,2) not null default 100 check (response_rate between 0 and 100),
  no_show_rate numeric(5,2) not null default 0 check (no_show_rate between 0 and 100),
  reputation_label text not null default 'New to the Loop',
  completed_sessions integer not null default 0 check (completed_sessions >= 0),
  onboarding_complete boolean not null default false,
  role public.account_role not null default 'member',
  account_status public.account_status not null default 'active',
  is_verified boolean not null default false,
  suspended_at timestamptz,
  suspended_by uuid references public.profiles(id) on delete set null,
  suspension_reason text,
  warning_count integer not null default 0 check (warning_count >= 0),
  last_active_at timestamptz not null default now(),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  category text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_teach_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  level public.skill_level not null default 'intermediate',
  description text,
  help_formats jsonb not null default '[]'::jsonb,
  years_experience smallint check (years_experience >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, skill_id)
);

create table public.user_learn_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  current_level public.skill_level not null default 'curious',
  goal text,
  preferred_format text,
  urgency text check (urgency in ('Today', 'This week', 'Long-term')),
  completed_at timestamptz,
  priority smallint not null default 2 check (priority between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, skill_id)
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  roles jsonb not null default '[]'::jsonb,
  main_goal text not null default '',
  availability jsonb not null default '[]'::jsonb,
  preferred_duration_minutes smallint not null default 30 check (preferred_duration_minutes in (15, 30, 60)),
  preferred_language text not null default 'English',
  learning_styles jsonb not null default '[]'::jsonb,
  notification_settings jsonb not null default '{"in_app":true,"email_requests":true,"email_messages":true,"email_sessions":true,"email_credits":true,"email_community":false}'::jsonb,
  profile_visibility text not null default 'public' check (profile_visibility in ('public','members')),
  allow_match_requests boolean not null default true,
  allow_circle_invites boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete cascade,
  helper_id uuid not null references public.profiles(id) on delete cascade,
  learn_skill_id uuid not null references public.skills(id) on delete cascade,
  teach_skill_id uuid references public.skills(id) on delete set null,
  compatibility_score numeric(5,2) not null check (compatibility_score between 0 and 100),
  match_reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (learner_id, helper_id, learn_skill_id),
  check (learner_id <> helper_id)
);

create table public.swap_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  requested_skill_id uuid not null references public.skills(id),
  offered_skill_id uuid references public.skills(id),
  request_type public.request_type not null default 'credit_session',
  preferred_format text not null default 'Video' check (preferred_format in ('Chat','Voice','Video','Project Review')),
  message text not null check (char_length(message) between 20 and 2000),
  proposed_duration_minutes smallint not null default 45 check (proposed_duration_minutes between 15 and 180),
  proposed_time timestamptz,
  credit_cost smallint not null default 1 check (credit_cost between 0 and 6),
  status public.request_status not null default 'pending',
  attachment_url text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  swap_request_id uuid unique references public.swap_requests(id) on delete set null,
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (participant_a <> participant_b)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  message_type public.message_type not null default 'text',
  body text not null check (char_length(body) between 1 and 5000),
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  swap_request_id uuid not null unique references public.swap_requests(id) on delete cascade,
  learner_id uuid not null references public.profiles(id),
  helper_id uuid not null references public.profiles(id),
  skill_id uuid not null references public.skills(id),
  starts_at timestamptz not null,
  duration_minutes smallint not null default 45 check (duration_minutes between 15 and 180),
  request_type public.request_type not null default 'credit_session',
  format text not null default 'Video' check (format in ('Chat','Voice','Video','Project Review')),
  credit_cost smallint not null default 0 check (credit_cost between 0 and 6),
  meeting_url text,
  status public.session_status not null default 'scheduled',
  learner_confirmed_at timestamptz,
  helper_confirmed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (learner_id <> helper_id)
);

create table public.session_preparation (
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  notes text not null default '' check (char_length(notes) <= 3000),
  project_link text,
  checklist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id,user_id)
);

create table public.credits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 2 check (balance >= 0),
  lifetime_earned integer not null default 0 check (lifetime_earned >= 0),
  lifetime_spent integer not null default 0 check (lifetime_spent >= 0),
  updated_at timestamptz not null default now()
);

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  related_session_id uuid references public.sessions(id) on delete set null,
  type public.transaction_kind not null,
  amount integer not null check (amount <> 0),
  balance_after integer not null check (balance_after >= 0),
  reason text not null,
  status public.credit_transaction_status not null default 'completed',
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  tags text[] not null default '{}'::text[],
  comment text check (char_length(comment) <= 1500),
  would_exchange_again boolean not null default true,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  unique (session_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null,
  icon_key text not null,
  created_at timestamptz not null default now()
);

create table public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table public.circles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null,
  category text not null default 'General',
  circle_type text not null default 'skill' check (circle_type in ('skill', 'goal', 'project', 'language', 'location')),
  language text not null default 'English',
  tags text[] not null default '{}'::text[],
  rules text[] not null default array['Be generous and specific','Respect every learning level']::text[],
  join_mode text not null default 'public' check (join_mode in ('public', 'request')),
  activity_level text not null default 'New' check (activity_level in ('New', 'Quiet', 'Active', 'Very active')),
  skill_id uuid references public.skills(id) on delete set null,
  cover_url text,
  is_private boolean not null default false,
  member_limit smallint not null default 12 check (member_limit between 2 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'moderator', 'member')),
  status text not null default 'active' check (status in ('pending', 'active')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create table public.circle_posts (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  post_type public.circle_post_type not null,
  title text not null check (char_length(title) between 3 and 140),
  body text not null check (char_length(body) between 3 and 5000),
  skill_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.circle_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.circle_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.circle_post_helpful (
  post_id uuid not null references public.circle_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.circle_rituals (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  title text not null,
  description text not null,
  cadence text not null default 'Weekly',
  prompt text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  review_id uuid references public.reviews(id) on delete set null,
  circle_post_id uuid references public.circle_posts(id) on delete set null,
  circle_reply_id uuid references public.circle_replies(id) on delete set null,
  reason text not null check (reason in ('spam','harassment','fake profile','scam','no-show','inappropriate content','unsafe behavior','other')),
  details text,
  status public.report_status not null default 'open',
  reviewed_by uuid references public.profiles(id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(reported_user_id,session_id,message_id,review_id,circle_post_id,circle_reply_id) >= 1),
  check (reported_user_id is null or reported_user_id <> reporter_id)
);

create table public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.no_show_flags (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  confirmed_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','confirmed','dismissed')),
  created_at timestamptz not null default now(),
  unique (session_id, reported_user_id)
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id uuid,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.activation_events (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_key text not null check (event_key in ('teach_skill','learn_skill','sent_request','received_request','joined_circle','completed_exchange','earned_credit','checklist_complete')),
  occurred_at timestamptz not null default now(),
  primary key (user_id,event_key)
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null unique references public.profiles(id) on delete cascade,
  referral_code text not null,
  status text not null default 'joined' check (status in ('joined','rewarded')),
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  check (inviter_id <> invitee_id)
);

create table public.public_help_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique,
  needed_skill text not null,
  offered_skill text,
  message text not null check (char_length(message) between 20 and 1000),
  status text not null default 'active' check (status in ('active','closed')),
  view_count integer not null default 0 check (view_count >= 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '30 days')
);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete cascade,
  recipient_email text not null,
  event_type text not null,
  subject text not null,
  body text not null,
  status text not null default 'queued' check (status in ('queued','sent','failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index matches_learner_idx on public.matches (learner_id, compatibility_score desc);
create index swap_requests_participants_idx on public.swap_requests (recipient_id, requester_id, status);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index sessions_participants_idx on public.sessions (learner_id, helper_id, starts_at);
create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc);
create index circle_posts_feed_idx on public.circle_posts (circle_id, created_at desc);
create index circle_replies_post_idx on public.circle_replies (post_id, created_at);
create index circle_members_user_idx on public.circle_members (user_id, status, joined_at desc);
create index reports_queue_idx on public.reports (status, created_at desc);
create index moderation_actions_admin_idx on public.moderation_actions (admin_id, created_at desc);
create index referrals_inviter_idx on public.referrals (inviter_id, status, created_at desc);
create index public_help_requests_owner_idx on public.public_help_requests (owner_id, status, created_at desc);
create index email_outbox_queue_idx on public.email_outbox (status, created_at);
create unique index swap_requests_no_duplicate_pending_idx on public.swap_requests (requester_id, recipient_id, requested_skill_id) where status = 'pending';

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$ declare t text; begin
  foreach t in array array['profiles','user_teach_skills','user_learn_skills','user_preferences','swap_requests','conversations','sessions','session_preparation','credits','circles','circle_posts','circle_replies','reports'] loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, username, referral_code) values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    trim(both '-' from regexp_replace(lower(coalesce(nullif(new.raw_user_meta_data ->> 'full_name',''),'member')), '[^a-z0-9]+', '-', 'g'))||'-'||substr(replace(new.id::text,'-',''),1,5),
    upper(substr(replace(new.id::text,'-',''),1,10))
  );
  insert into public.credits (user_id) values (new.id);
  insert into public.credit_transactions (user_id, type, amount, balance_after, reason, status) values (new.id, 'bonus', 2, 2, 'SkillLoop starter credits', 'completed');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role='admin' or is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_suspended(target_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select account_status='suspended' from public.profiles where id=target_user),false);
$$;

create or replace function public.users_are_blocked(left_user uuid, right_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.blocked_users where (blocker_id=left_user and blocked_id=right_user) or (blocker_id=right_user and blocked_id=left_user));
$$;

create or replace function public.protect_admin_flag() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.is_admin is distinct from old.is_admin or new.role is distinct from old.role or new.account_status is distinct from old.account_status or new.is_verified is distinct from old.is_verified or new.suspended_at is distinct from old.suspended_at or new.suspended_by is distinct from old.suspended_by or new.suspension_reason is distinct from old.suspension_reason or new.warning_count is distinct from old.warning_count) and not public.is_admin() then
    raise exception 'Only administrators can change protected account fields';
  end if;
  return new;
end;
$$;
create trigger protect_profile_admin before update on public.profiles
for each row execute function public.protect_admin_flag();

create or replace function public.enforce_active_actor() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and public.is_suspended(auth.uid()) then raise exception 'This account is suspended'; end if;
  return new;
end; $$;

do $$ declare t text; begin
  foreach t in array array['profiles','user_teach_skills','user_learn_skills','swap_requests','messages','sessions','session_preparation','reviews','circles','circle_members','circle_posts','circle_replies','circle_post_helpful','reports'] loop
    execute format('create trigger enforce_active_%I before insert or update on public.%I for each row execute function public.enforce_active_actor()',t,t);
  end loop;
end $$;

create or replace function public.protect_blocked_contact() returns trigger
language plpgsql security definer set search_path = '' as $$
declare other_user uuid;
begin
  if tg_table_name='swap_requests' then other_user:=case when new.requester_id=auth.uid() then new.recipient_id else new.requester_id end;
  else select case when c.participant_a=auth.uid() then c.participant_b else c.participant_a end into other_user from public.conversations c where c.id=new.conversation_id; end if;
  if other_user is not null and public.users_are_blocked(auth.uid(),other_user) then raise exception 'Contact is unavailable'; end if;
  return new;
end; $$;
create trigger prevent_blocked_requests before insert on public.swap_requests for each row execute function public.protect_blocked_contact();
create trigger prevent_blocked_messages before insert on public.messages for each row when (new.sender_id is not null) execute function public.protect_blocked_contact();

create or replace function public.is_circle_member(target_circle uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.circle_members where circle_id = target_circle and user_id = auth.uid() and status = 'active');
$$;

create or replace function public.add_circle_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.circle_members (circle_id, user_id, role) values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;
create trigger on_circle_created after insert on public.circles
for each row execute function public.add_circle_owner();

alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.user_teach_skills enable row level security;
alter table public.user_learn_skills enable row level security;
alter table public.user_preferences enable row level security;
alter table public.matches enable row level security;
alter table public.swap_requests enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.sessions enable row level security;
alter table public.session_preparation enable row level security;
alter table public.credits enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.reviews enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_posts enable row level security;
alter table public.circle_replies enable row level security;
alter table public.circle_post_helpful enable row level security;
alter table public.circle_rituals enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.blocked_users enable row level security;
alter table public.no_show_flags enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.activation_events enable row level security;
alter table public.referrals enable row level security;
alter table public.public_help_requests enable row level security;
alter table public.email_outbox enable row level security;

create policy "Public profiles are readable" on public.profiles for select using (true);
create policy "Users update their own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "Active skills are readable" on public.skills for select using (is_active or public.is_admin());
create policy "Admins manage skills" on public.skills for all using (public.is_admin()) with check (public.is_admin());

create policy "Teach skills are readable" on public.user_teach_skills for select using (true);
create policy "Users manage their teach skills" on public.user_teach_skills for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Learn skills are readable" on public.user_learn_skills for select using (true);
create policy "Users manage their learn skills" on public.user_learn_skills for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users view their preferences" on public.user_preferences for select using (user_id = auth.uid());
create policy "Users manage their preferences" on public.user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users view their matches" on public.matches for select using (auth.uid() in (learner_id, helper_id));

create policy "Participants view requests" on public.swap_requests for select using (auth.uid() in (requester_id, recipient_id));
create policy "Participants view conversations" on public.conversations for select using (auth.uid() in (participant_a, participant_b));
create policy "Participants view messages" on public.messages for select using (exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.participant_a, c.participant_b)));
create policy "Participants send messages" on public.messages for insert with check (sender_id = auth.uid() and message_type='text' and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.participant_a, c.participant_b)));
create policy "Participants view sessions" on public.sessions for select using (auth.uid() in (learner_id, helper_id));
create policy "Participants view preparation" on public.session_preparation for select using (exists(select 1 from public.sessions s where s.id=session_id and auth.uid() in (s.learner_id,s.helper_id)));

create policy "Users view their credits" on public.credits for select using (user_id = auth.uid());
create policy "Users view their transactions" on public.credit_transactions for select using (user_id = auth.uid());
create policy "Public reviews are readable" on public.reviews for select using (is_public or reviewer_id = auth.uid() or reviewee_id = auth.uid());
create policy "Participants create reviews" on public.reviews for insert with check (reviewer_id = auth.uid() and exists (select 1 from public.sessions s where s.id = session_id and s.status = 'completed' and auth.uid() in (s.learner_id, s.helper_id) and reviewee_id = case when auth.uid() = s.learner_id then s.helper_id else s.learner_id end));
create policy "Badges are readable" on public.badges for select using (true);
create policy "User badges are readable" on public.user_badges for select using (true);

create policy "Public circles are readable" on public.circles for select using (not is_private or owner_id = auth.uid() or public.is_circle_member(id));
create policy "Users create circles" on public.circles for insert with check (owner_id = auth.uid());
create policy "Owners manage circles" on public.circles for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Visible circle members are readable" on public.circle_members for select using (exists (select 1 from public.circles c where c.id = circle_id and (not c.is_private or c.owner_id = auth.uid() or public.is_circle_member(c.id))));
create policy "Users join visible circles" on public.circle_members for insert with check (user_id = auth.uid() and role = 'member' and exists (select 1 from public.circles c where c.id = circle_id and not c.is_private and ((c.join_mode = 'public' and status = 'active') or (c.join_mode = 'request' and status = 'pending'))));
create policy "Users leave circles" on public.circle_members for delete using (user_id = auth.uid());
create policy "Circle posts are visible to circle readers" on public.circle_posts for select using (exists (select 1 from public.circles c where c.id = circle_id and (not c.is_private or c.owner_id = auth.uid() or public.is_circle_member(c.id))));
create policy "Active members create posts" on public.circle_posts for insert with check (author_id = auth.uid() and public.is_circle_member(circle_id));
create policy "Authors manage circle posts" on public.circle_posts for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Authors delete circle posts" on public.circle_posts for delete using (author_id = auth.uid() or public.is_admin());
create policy "Circle replies follow post visibility" on public.circle_replies for select using (exists (select 1 from public.circle_posts p join public.circles c on c.id = p.circle_id where p.id = post_id and (not c.is_private or c.owner_id = auth.uid() or public.is_circle_member(c.id))));
create policy "Active members create replies" on public.circle_replies for insert with check (author_id = auth.uid() and exists (select 1 from public.circle_posts p where p.id = post_id and public.is_circle_member(p.circle_id)));
create policy "Authors manage replies" on public.circle_replies for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Helpful votes are visible" on public.circle_post_helpful for select using (exists (select 1 from public.circle_posts p join public.circles c on c.id = p.circle_id where p.id = post_id and (not c.is_private or public.is_circle_member(c.id))));
create policy "Members add helpful votes" on public.circle_post_helpful for insert with check (user_id = auth.uid() and exists (select 1 from public.circle_posts p where p.id = post_id and public.is_circle_member(p.circle_id)));
create policy "Users remove helpful votes" on public.circle_post_helpful for delete using (user_id = auth.uid());
create policy "Circle rituals are visible with circles" on public.circle_rituals for select using (exists (select 1 from public.circles c where c.id = circle_id and (not c.is_private or c.owner_id = auth.uid() or public.is_circle_member(c.id))));
create policy "Circle owners manage rituals" on public.circle_rituals for all using (exists (select 1 from public.circles c where c.id = circle_id and c.owner_id = auth.uid())) with check (exists (select 1 from public.circles c where c.id = circle_id and c.owner_id = auth.uid()));

create policy "Reporters view their reports" on public.reports for select using (reporter_id = auth.uid() or public.is_admin());
create policy "Users create valid reports" on public.reports for insert with check (reporter_id = auth.uid() and reported_user_id<>auth.uid() and (message_id is null or exists(select 1 from public.messages m join public.conversations c on c.id=m.conversation_id where m.id=message_id and auth.uid() in(c.participant_a,c.participant_b))) and (session_id is null or exists(select 1 from public.sessions s where s.id=session_id and auth.uid() in(s.learner_id,s.helper_id))) and (review_id is null or exists(select 1 from public.reviews r where r.id=review_id and r.is_public)) and (circle_post_id is null or exists(select 1 from public.circle_posts p join public.circles c on c.id=p.circle_id where p.id=circle_post_id and (not c.is_private or public.is_circle_member(c.id)))) and (circle_reply_id is null or exists(select 1 from public.circle_replies cr join public.circle_posts p on p.id=cr.post_id join public.circles c on c.id=p.circle_id where cr.id=circle_reply_id and (not c.is_private or public.is_circle_member(c.id)))));
create policy "Admins manage reports" on public.reports for update using (public.is_admin()) with check (public.is_admin());
create policy "Users view their notifications" on public.notifications for select using (user_id = auth.uid());
create policy "Users mark notifications read" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage their blocks" on public.blocked_users for all using (blocker_id=auth.uid()) with check (blocker_id=auth.uid());
create policy "Participants view no-show flags" on public.no_show_flags for select using (reporter_id=auth.uid() or reported_user_id=auth.uid() or public.is_admin());
create policy "Participants flag no-shows" on public.no_show_flags for insert with check (reporter_id=auth.uid() and exists(select 1 from public.sessions s where s.id=session_id and auth.uid() in(s.learner_id,s.helper_id) and reported_user_id in(s.learner_id,s.helper_id) and reported_user_id<>auth.uid()));
create policy "Admins manage no-show flags" on public.no_show_flags for update using (public.is_admin()) with check (public.is_admin());
create policy "Admins view moderation actions" on public.moderation_actions for select using (public.is_admin());
create policy "Users view their activation" on public.activation_events for select using (user_id=auth.uid());
create policy "Referral participants view progress" on public.referrals for select using (auth.uid() in(inviter_id,invitee_id));
create policy "Active public help requests are readable" on public.public_help_requests for select using (status='active' and expires_at>now() or owner_id=auth.uid());
create policy "Users manage their public help requests" on public.public_help_requests for all using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy "Admins inspect email queue" on public.email_outbox for select using (public.is_admin());

revoke select on public.profiles from anon, authenticated;
grant select(id,full_name,username,headline,bio,avatar_url,languages,timezone,reputation_score,response_rate,no_show_rate,reputation_label,completed_sessions,onboarding_complete,created_at) on public.profiles to anon, authenticated;
revoke update on public.profiles from authenticated;
grant update(full_name,username,headline,bio,avatar_url,languages,timezone,availability,onboarding_complete,last_active_at) on public.profiles to authenticated;
revoke insert, update, delete on public.swap_requests, public.conversations, public.sessions, public.session_preparation, public.credits, public.credit_transactions, public.reviews from anon, authenticated;
revoke insert, delete on public.notifications from anon, authenticated;
revoke update on public.notifications from authenticated;
grant update(read_at) on public.notifications to authenticated;

create or replace function public.get_my_access() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('role',role,'isAdmin',role='admin' or is_admin,'accountStatus',account_status,'verified',is_verified,'onboardingComplete',onboarding_complete) from public.profiles where id=auth.uid();
$$;
grant execute on function public.get_my_access() to authenticated;

-- Saves the complete onboarding payload atomically. The function owns custom skill
-- creation so authenticated users never receive broad write access to the skill catalog.
create or replace function public.complete_onboarding(onboarding_payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  skill_record jsonb;
  resolved_skill_id uuid;
  skill_name text;
  skill_slug text;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;

  update public.profiles set
    full_name = coalesce(nullif(trim(onboarding_payload ->> 'full_name'), ''), full_name),
    bio = coalesce(onboarding_payload ->> 'bio', bio),
    avatar_url = coalesce(nullif(onboarding_payload ->> 'avatar_url', ''), avatar_url),
    timezone = coalesce(nullif(onboarding_payload ->> 'timezone', ''), timezone),
    languages = case when onboarding_payload ? 'languages' then array(select jsonb_array_elements_text(onboarding_payload -> 'languages')) when onboarding_payload ? 'language' then array[onboarding_payload ->> 'language'] else languages end,
    availability = jsonb_build_object('windows', coalesce(onboarding_payload -> 'availability', '[]'::jsonb)),
    onboarding_complete = true
  where id = owner_id;

  insert into public.user_preferences (user_id, roles, main_goal, availability, preferred_duration_minutes, preferred_language, learning_styles)
  values (owner_id, coalesce(onboarding_payload -> 'roles', '[]'::jsonb), coalesce(onboarding_payload ->> 'goal', ''), coalesce(onboarding_payload -> 'availability', '[]'::jsonb), coalesce((onboarding_payload ->> 'duration')::smallint, 30), coalesce(onboarding_payload ->> 'language', 'English'), coalesce(onboarding_payload -> 'styles', '[]'::jsonb))
  on conflict (user_id) do update set roles=excluded.roles, main_goal=excluded.main_goal, availability=excluded.availability, preferred_duration_minutes=excluded.preferred_duration_minutes, preferred_language=excluded.preferred_language, learning_styles=excluded.learning_styles, updated_at=now();

  delete from public.user_teach_skills where user_id = owner_id;
  for skill_record in select value from jsonb_array_elements(coalesce(onboarding_payload -> 'teach', '[]'::jsonb)) loop
    skill_name := trim(skill_record ->> 'name');
    skill_slug := trim(both '-' from regexp_replace(lower(skill_name), '[^a-z0-9]+', '-', 'g')) || '-' || substr(md5(lower(skill_name)), 1, 6);
    insert into public.skills(name, slug, category) values(skill_name, skill_slug, 'Community') on conflict(name) do nothing;
    select id into resolved_skill_id from public.skills where name = skill_name;
    insert into public.user_teach_skills(user_id, skill_id, level, description, help_formats) values(owner_id, resolved_skill_id, coalesce((skill_record ->> 'level')::public.skill_level, 'intermediate'), skill_record ->> 'description', jsonb_build_array(coalesce(skill_record ->> 'format', 'Video')));
  end loop;

  delete from public.user_learn_skills where user_id = owner_id;
  for skill_record in select value from jsonb_array_elements(coalesce(onboarding_payload -> 'learn', '[]'::jsonb)) loop
    skill_name := trim(skill_record ->> 'name');
    skill_slug := trim(both '-' from regexp_replace(lower(skill_name), '[^a-z0-9]+', '-', 'g')) || '-' || substr(md5(lower(skill_name)), 1, 6);
    insert into public.skills(name, slug, category) values(skill_name, skill_slug, 'Community') on conflict(name) do nothing;
    select id into resolved_skill_id from public.skills where name = skill_name;
    insert into public.user_learn_skills(user_id, skill_id, current_level, goal, preferred_format, urgency, completed_at) values(owner_id, resolved_skill_id, coalesce((skill_record ->> 'level')::public.skill_level, 'curious'), skill_record ->> 'goal', skill_record ->> 'format', skill_record ->> 'urgency', case when coalesce((skill_record ->> 'completed')::boolean, false) then now() else null end);
  end loop;
  perform public.refresh_user_activation(owner_id);
end;
$$;

grant execute on function public.complete_onboarding(jsonb) to authenticated;

-- Returns only the profile signals needed for dynamic matching. Scoring remains
-- explainable in the application and no private contact information is exposed.
create or replace function public.get_match_candidates() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'name', p.full_name,
    'avatarUrl', p.avatar_url,
    'bio', p.bio,
    'languages', p.languages,
    'availability', coalesce(pref.availability, '[]'::jsonb),
    'styles', coalesce(pref.learning_styles, '[]'::jsonb),
    'preferredDuration', coalesce(pref.preferred_duration_minutes, 30),
    'teach', coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'category',s.category,'level',uts.level,'formats',uts.help_formats,'description',uts.description)) from public.user_teach_skills uts join public.skills s on s.id=uts.skill_id where uts.user_id=p.id), '[]'::jsonb),
    'learn', coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'category',s.category,'level',uls.current_level,'formats',jsonb_build_array(coalesce(uls.preferred_format,'Video')),'goal',uls.goal)) from public.user_learn_skills uls join public.skills s on s.id=uls.skill_id where uls.user_id=p.id and uls.completed_at is null), '[]'::jsonb),
    'rating', coalesce((select round(avg(r.rating)::numeric,1) from public.reviews r where r.reviewee_id=p.id and r.is_public), 0),
    'reviewCount', (select count(*) from public.reviews r where r.reviewee_id=p.id and r.is_public),
    'responseRate', coalesce((select round(100.0*count(*) filter(where sr.status<>'pending')/nullif(count(*),0)) from public.swap_requests sr where sr.recipient_id=p.id), 100),
    'completedSessions', p.completed_sessions,
    'createdAt', p.created_at
  ) order by p.created_at desc), '[]'::jsonb)
  from public.profiles p left join public.user_preferences pref on pref.user_id=p.id
  where p.id<>auth.uid() and p.onboarding_complete and not public.users_are_blocked(auth.uid(),p.id) and p.account_status='active';
$$;
grant execute on function public.get_match_candidates() to authenticated;

create or replace function public.request_credit_cost(kind public.request_type, minutes smallint) returns smallint
language sql immutable set search_path = '' as $$
  select case when kind in ('direct_swap','learning_partner') then 0 when kind='project_review' then greatest(1, least(6, ceil(minutes::numeric / 30)::smallint)) else 1 end;
$$;

create or replace function public.create_swap_request(request_payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid(); recipient uuid := (request_payload->>'recipient_id')::uuid;
  needed uuid := (request_payload->>'requested_skill_id')::uuid; offered uuid := nullif(request_payload->>'offered_skill_id','')::uuid;
  kind public.request_type := (request_payload->>'request_type')::public.request_type;
  minutes smallint := coalesce((request_payload->>'duration')::smallint,30); cost smallint; created_id uuid;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  if owner_id=recipient then raise exception 'You cannot send a request to yourself'; end if;
  if minutes<15 or minutes>180 then raise exception 'Duration must be between 15 and 180 minutes'; end if;
  if char_length(trim(coalesce(request_payload->>'message','')))<20 then raise exception 'Add a more thoughtful message'; end if;
  if nullif(request_payload->>'proposed_time','') is not null and (request_payload->>'proposed_time')::timestamptz<=now() then raise exception 'Proposed time must be in the future'; end if;
  if not exists(select 1 from public.user_teach_skills where user_id=recipient and skill_id=needed) and kind<>'learning_partner' then raise exception 'This member no longer teaches the requested skill'; end if;
  if kind='learning_partner' and not (exists(select 1 from public.user_learn_skills where user_id=owner_id and skill_id=needed and completed_at is null) and exists(select 1 from public.user_learn_skills where user_id=recipient and skill_id=needed and completed_at is null)) then raise exception 'This learning-partner request is no longer valid'; end if;
  if kind='direct_swap' and (offered is null or not exists(select 1 from public.user_teach_skills where user_id=owner_id and skill_id=offered) or not exists(select 1 from public.user_learn_skills where user_id=recipient and skill_id=offered and completed_at is null)) then raise exception 'A direct swap needs a valid skill both sides want'; end if;
  if exists(select 1 from public.swap_requests where requester_id=owner_id and recipient_id=recipient and requested_skill_id=needed and status='pending') then raise exception 'You already have a pending request for this skill'; end if;
  cost := public.request_credit_cost(kind,minutes);
  insert into public.swap_requests(requester_id,recipient_id,requested_skill_id,offered_skill_id,request_type,preferred_format,message,proposed_duration_minutes,proposed_time,credit_cost,attachment_url)
  values(owner_id,recipient,needed,offered,kind,coalesce(request_payload->>'format','Video'),trim(request_payload->>'message'),minutes,nullif(request_payload->>'proposed_time','')::timestamptz,cost,nullif(request_payload->>'attachment_url','')) returning id into created_id;
  insert into public.notifications(user_id,type,title,body,action_url) values(recipient,'swap_request','New skill request','A member wants to learn from you.','/requests');
  return created_id;
end; $$;
grant execute on function public.create_swap_request(jsonb) to authenticated;

create or replace function public.add_system_message(target_request uuid, content text) returns void
language plpgsql security definer set search_path = '' as $$
declare conversation_id uuid;
begin
  select id into conversation_id from public.conversations where swap_request_id=target_request;
  if conversation_id is not null then
    insert into public.messages(conversation_id,sender_id,message_type,body) values(conversation_id,null,'system',content);
    update public.conversations set last_message_at=now() where id=conversation_id;
  end if;
end; $$;
revoke all on function public.add_system_message(uuid,text) from public, anon, authenticated;

create or replace function public.respond_swap_request(target_request uuid, decision text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare req public.swap_requests%rowtype; created_session uuid; learner_balance integer; helper_balance integer;
begin
  select * into req from public.swap_requests where id=target_request for update;
  if req.id is null or req.recipient_id<>auth.uid() then raise exception 'Request not found'; end if;
  if public.users_are_blocked(req.requester_id,req.recipient_id) then raise exception 'This request can no longer be accepted'; end if;
  if req.status<>'pending' then raise exception 'This request is no longer pending'; end if;
  if decision='decline' then
    update public.swap_requests set status='declined',responded_at=now() where id=req.id;
    insert into public.notifications(user_id,type,title,body,action_url) values(req.requester_id,'request_declined','Request declined','The member could not accept this request.','/requests');
    return null;
  end if;
  if decision<>'accept' then raise exception 'Invalid decision'; end if;
  if exists(select 1 from public.sessions where swap_request_id=req.id) then raise exception 'A session already exists for this request'; end if;
  if req.request_type<>'learning_partner' and not exists(select 1 from public.user_teach_skills where user_id=req.recipient_id and skill_id=req.requested_skill_id) then raise exception 'The requested skill is no longer available'; end if;
  if req.request_type='learning_partner' and not (exists(select 1 from public.user_learn_skills where user_id=req.requester_id and skill_id=req.requested_skill_id and completed_at is null) and exists(select 1 from public.user_learn_skills where user_id=req.recipient_id and skill_id=req.requested_skill_id and completed_at is null)) then raise exception 'This learning partnership is no longer valid'; end if;
  if req.request_type='direct_swap' and (req.offered_skill_id is null or not exists(select 1 from public.user_teach_skills where user_id=req.requester_id and skill_id=req.offered_skill_id) or not exists(select 1 from public.user_learn_skills where user_id=req.recipient_id and skill_id=req.offered_skill_id and completed_at is null)) then raise exception 'The direct swap is no longer valid'; end if;
  if req.credit_cost>0 then
    select balance into learner_balance from public.credits where user_id=req.requester_id for update;
    if learner_balance<req.credit_cost then raise exception 'The learner does not have enough available credits'; end if;
    select balance into helper_balance from public.credits where user_id=req.recipient_id for update;
    update public.credits set balance=balance-req.credit_cost where user_id=req.requester_id;
  end if;
  insert into public.sessions(swap_request_id,learner_id,helper_id,skill_id,starts_at,duration_minutes,request_type,format,credit_cost)
  values(req.id,req.requester_id,req.recipient_id,req.requested_skill_id,coalesce(req.proposed_time,now()+interval '1 day'),req.proposed_duration_minutes,req.request_type,req.preferred_format,req.credit_cost) returning id into created_session;
  insert into public.conversations(swap_request_id,participant_a,participant_b) values(req.id,req.requester_id,req.recipient_id) on conflict(swap_request_id) do nothing;
  perform public.add_system_message(req.id,'Request accepted. Your learning exchange is ready.');
  perform public.add_system_message(req.id,'Session scheduled for '||to_char(coalesce(req.proposed_time,now()+interval '1 day'),'Mon DD at HH12:MI AM')||'.');
  if req.credit_cost>0 then
    insert into public.credit_transactions(user_id,related_session_id,type,amount,balance_after,reason,status) values
      (req.requester_id,created_session,'spent',-req.credit_cost,learner_balance-req.credit_cost,'Credits reserved for accepted session','pending'),
      (req.recipient_id,created_session,'earned',req.credit_cost,helper_balance,'Credits pending session completion','pending');
  end if;
  update public.swap_requests set status='accepted',responded_at=now() where id=req.id;
  insert into public.notifications(user_id,type,title,body,action_url) values
    (req.requester_id,'request_accepted','Request accepted','Your session is ready to plan.','/sessions'),
    (req.recipient_id,'session_created','Session created','The exchange is now scheduled.','/sessions');
  return created_session;
end; $$;
grant execute on function public.respond_swap_request(uuid,text) to authenticated;

create or replace function public.cancel_swap_request(target_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare req public.swap_requests%rowtype; sess public.sessions%rowtype; learner_balance integer;
begin
  select * into req from public.swap_requests where id=target_request for update;
  if req.id is null or req.requester_id<>auth.uid() then raise exception 'Request not found'; end if;
  if req.status not in ('pending','accepted') then raise exception 'This request cannot be cancelled'; end if;
  if req.status='accepted' then
    select * into sess from public.sessions where swap_request_id=req.id for update;
    if sess.status<>'scheduled' or sess.learner_confirmed_at is not null or sess.helper_confirmed_at is not null then raise exception 'A started or confirmed session cannot be cancelled'; end if;
    update public.sessions set status='cancelled' where id=sess.id;
    if sess.credit_cost>0 then
      update public.credits set balance=balance+sess.credit_cost where user_id=sess.learner_id returning balance into learner_balance;
      update public.credit_transactions set status='cancelled' where related_session_id=sess.id and status='pending';
      insert into public.credit_transactions(user_id,related_session_id,type,amount,balance_after,reason,status) values(sess.learner_id,sess.id,'refund',sess.credit_cost,learner_balance,'Credits returned after cancellation','refunded');
    end if;
  end if;
  update public.swap_requests set status='cancelled' where id=req.id;
  insert into public.notifications(user_id,type,title,body,action_url) values(req.recipient_id,'request_cancelled','Request cancelled','The requester cancelled this exchange.','/requests');
end; $$;
grant execute on function public.cancel_swap_request(uuid) to authenticated;

create or replace function public.confirm_session(target_session uuid, outcome text default 'confirm') returns public.session_status
language plpgsql security definer set search_path = '' as $$
declare sess public.sessions%rowtype; updated public.sessions%rowtype; helper_balance integer; learner_balance integer;
begin
  select * into sess from public.sessions where id=target_session for update;
  if sess.id is null or auth.uid() not in (sess.learner_id,sess.helper_id) then raise exception 'Session not found'; end if;
  if sess.status not in ('scheduled','in_progress') then raise exception 'This session cannot be confirmed'; end if;
  if outcome='dispute' then
    update public.sessions set status='disputed' where id=sess.id;
    update public.swap_requests set status='disputed' where id=sess.swap_request_id;
    perform public.add_system_message(sess.swap_request_id,'A participant reported an issue. Credits remain protected while the session is reviewed.');
    insert into public.notifications(user_id,type,title,body,action_url) values(case when auth.uid()=sess.learner_id then sess.helper_id else sess.learner_id end,'session_disputed','Session needs review','The exchange was reported for review.','/sessions');
    return 'disputed';
  end if;
  if outcome<>'confirm' then raise exception 'Invalid outcome'; end if;
  if auth.uid()=sess.learner_id then update public.sessions set learner_confirmed_at=coalesce(learner_confirmed_at,now()) where id=sess.id returning * into updated;
  else update public.sessions set helper_confirmed_at=coalesce(helper_confirmed_at,now()) where id=sess.id returning * into updated; end if;
  perform public.add_system_message(sess.swap_request_id,case when auth.uid()=sess.learner_id then 'The learner confirmed completion.' else 'The helper confirmed completion.' end);
  if updated.learner_confirmed_at is not null and updated.helper_confirmed_at is not null then
    update public.sessions set status='completed',completed_at=now() where id=sess.id;
    update public.swap_requests set status='completed' where id=sess.swap_request_id;
    if sess.credit_cost>0 then
      update public.credits set balance=balance+sess.credit_cost,lifetime_earned=lifetime_earned+sess.credit_cost where user_id=sess.helper_id returning balance into helper_balance;
      update public.credits set lifetime_spent=lifetime_spent+sess.credit_cost where user_id=sess.learner_id returning balance into learner_balance;
      update public.credit_transactions set status='completed',balance_after=case when user_id=sess.helper_id then helper_balance else learner_balance end where related_session_id=sess.id and status='pending';
    end if;
    update public.profiles set completed_sessions=completed_sessions+1 where id in (sess.learner_id,sess.helper_id);
    perform public.add_system_message(sess.swap_request_id,case when sess.credit_cost>0 then 'Both people confirmed. Credits released.' else 'Both people confirmed. Skill swap completed.' end);
    insert into public.notifications(user_id,type,title,body,action_url) values
      (sess.learner_id,'review_prompt','Exchange complete','Share a review while the session is fresh.','/sessions'),
      (sess.helper_id,'credits_earned','Exchange complete',case when sess.credit_cost>0 then 'Your pending credits are now available.' else 'Your direct swap is complete.' end,'/wallet');
    return 'completed';
  end if;
  insert into public.notifications(user_id,type,title,body,action_url) values(case when auth.uid()=sess.learner_id then sess.helper_id else sess.learner_id end,'confirmation_waiting','Completion confirmation','The other member confirmed this session.','/sessions');
  return 'scheduled';
end; $$;
grant execute on function public.confirm_session(uuid,text) to authenticated;

create or replace function public.get_request_workspace() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'direction',case when r.requester_id=auth.uid() then 'outgoing' else 'incoming' end,
    'partnerId',case when r.requester_id=auth.uid() then r.recipient_id else r.requester_id end,
    'partnerName',case when r.requester_id=auth.uid() then recipient.full_name else requester.full_name end,
    'partnerAvatar',case when r.requester_id=auth.uid() then recipient.avatar_url else requester.avatar_url end,
    'requestType',r.request_type,'status',r.status,'neededSkillId',r.requested_skill_id,'neededSkill',needed.name,
    'offeredSkillId',r.offered_skill_id,'offeredSkill',offered.name,'format',r.preferred_format,'duration',r.proposed_duration_minutes,
    'proposedTime',r.proposed_time,'creditCost',r.credit_cost,'message',r.message,'createdAt',r.created_at,'attachmentUrl',r.attachment_url,
    'conversationId',(select c.id from public.conversations c where c.swap_request_id=r.id),
    'session',(select jsonb_build_object('id',s.id,'status',s.status,'startsAt',s.starts_at,'learnerId',s.learner_id,'helperId',s.helper_id,'learnerConfirmed',s.learner_confirmed_at is not null,'helperConfirmed',s.helper_confirmed_at is not null,'creditCost',s.credit_cost) from public.sessions s where s.swap_request_id=r.id)
  ) order by r.created_at desc),'[]'::jsonb)
  from public.swap_requests r join public.profiles requester on requester.id=r.requester_id join public.profiles recipient on recipient.id=r.recipient_id join public.skills needed on needed.id=r.requested_skill_id left join public.skills offered on offered.id=r.offered_skill_id
  where auth.uid() in (r.requester_id,r.recipient_id);
$$;
grant execute on function public.get_request_workspace() to authenticated;

create or replace function public.resolve_disputed_session(target_session uuid, resolution text) returns void
language plpgsql security definer set search_path = '' as $$
declare sess public.sessions%rowtype; helper_balance integer; learner_balance integer;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into sess from public.sessions where id=target_session for update;
  if sess.id is null or sess.status<>'disputed' then raise exception 'Disputed session not found'; end if;
  if resolution='refund' then
    if sess.credit_cost>0 then
      update public.credits set balance=balance+sess.credit_cost where user_id=sess.learner_id returning balance into learner_balance;
      update public.credit_transactions set status='cancelled' where related_session_id=sess.id and status='pending';
      insert into public.credit_transactions(user_id,related_session_id,type,amount,balance_after,reason,status) values(sess.learner_id,sess.id,'refund',sess.credit_cost,learner_balance,'Admin refund after disputed session','refunded');
    end if;
    update public.sessions set status='cancelled' where id=sess.id;
    update public.swap_requests set status='cancelled' where id=sess.swap_request_id;
  elsif resolution='release' then
    if sess.credit_cost>0 then
      update public.credits set balance=balance+sess.credit_cost,lifetime_earned=lifetime_earned+sess.credit_cost where user_id=sess.helper_id returning balance into helper_balance;
      update public.credits set lifetime_spent=lifetime_spent+sess.credit_cost where user_id=sess.learner_id returning balance into learner_balance;
      update public.credit_transactions set status='completed',balance_after=case when user_id=sess.helper_id then helper_balance else learner_balance end where related_session_id=sess.id and status='pending';
    end if;
    update public.sessions set status='completed',completed_at=now() where id=sess.id;
    update public.swap_requests set status='completed' where id=sess.swap_request_id;
    update public.profiles set completed_sessions=completed_sessions+1 where id in (sess.learner_id,sess.helper_id);
  else raise exception 'Resolution must be refund or release'; end if;
  insert into public.notifications(user_id,type,title,body,action_url) values
    (sess.learner_id,'dispute_resolved','Dispute resolved','An administrator reviewed your exchange.','/wallet'),
    (sess.helper_id,'dispute_resolved','Dispute resolved','An administrator reviewed your exchange.','/wallet');
end; $$;
grant execute on function public.resolve_disputed_session(uuid,text) to authenticated;

create or replace function public.get_chat_workspace() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'partnerId',case when c.participant_a=auth.uid() then c.participant_b else c.participant_a end,
    'partnerName',case when c.participant_a=auth.uid() then pb.full_name else pa.full_name end,
    'partnerAvatar',case when c.participant_a=auth.uid() then pb.avatar_url else pa.avatar_url end,
    'lastMessage',coalesce((select m.body from public.messages m where m.conversation_id=c.id order by m.created_at desc limit 1),'Your conversation is ready.'),
    'lastMessageAt',coalesce(c.last_message_at,c.created_at),
    'unreadCount',(select count(*) from public.messages m where m.conversation_id=c.id and m.sender_id is distinct from auth.uid() and m.read_at is null),
    'session',(select jsonb_build_object('id',s.id,'status',s.status,'skill',sk.name,'offeredSkill',offered.name,'requestType',s.request_type,'format',s.format,'startsAt',s.starts_at,'duration',s.duration_minutes,'creditCost',s.credit_cost,'learnerId',s.learner_id,'helperId',s.helper_id,'learnerConfirmed',s.learner_confirmed_at is not null,'helperConfirmed',s.helper_confirmed_at is not null) from public.sessions s join public.skills sk on sk.id=s.skill_id join public.swap_requests r on r.id=s.swap_request_id left join public.skills offered on offered.id=r.offered_skill_id where s.swap_request_id=c.swap_request_id)
  ) order by coalesce(c.last_message_at,c.created_at) desc),'[]'::jsonb)
  from public.conversations c join public.profiles pa on pa.id=c.participant_a join public.profiles pb on pb.id=c.participant_b
  where auth.uid() in (c.participant_a,c.participant_b);
$$;
grant execute on function public.get_chat_workspace() to authenticated;

create or replace function public.get_conversation_messages(target_conversation uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when exists(select 1 from public.conversations c where c.id=target_conversation and auth.uid() in(c.participant_a,c.participant_b)) then
    coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'senderId',m.sender_id,'senderName',p.full_name,'type',m.message_type,'body',m.body,'readAt',m.read_at,'createdAt',m.created_at) order by m.created_at) from public.messages m left join public.profiles p on p.id=m.sender_id where m.conversation_id=target_conversation),'[]'::jsonb)
  else '[]'::jsonb end;
$$;
grant execute on function public.get_conversation_messages(uuid) to authenticated;

create or replace function public.send_chat_message(target_conversation uuid, content text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare convo public.conversations%rowtype; created_id uuid; recipient uuid;
begin
  select * into convo from public.conversations where id=target_conversation;
  if convo.id is null or auth.uid() not in(convo.participant_a,convo.participant_b) then raise exception 'Conversation not found'; end if;
  if char_length(trim(content))<1 or char_length(content)>5000 then raise exception 'Message must be between 1 and 5000 characters'; end if;
  insert into public.messages(conversation_id,sender_id,message_type,body) values(convo.id,auth.uid(),'text',trim(content)) returning id into created_id;
  update public.conversations set last_message_at=now() where id=convo.id;
  recipient:=case when auth.uid()=convo.participant_a then convo.participant_b else convo.participant_a end;
  insert into public.notifications(user_id,type,title,body,action_url) values(recipient,'new_message','New message',left(trim(content),120),'/chat?conversation='||convo.id);
  return created_id;
end; $$;
grant execute on function public.send_chat_message(uuid,text) to authenticated;

create or replace function public.mark_conversation_read(target_conversation uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.conversations c where c.id=target_conversation and auth.uid() in(c.participant_a,c.participant_b)) then raise exception 'Conversation not found'; end if;
  update public.messages set read_at=coalesce(read_at,now()) where conversation_id=target_conversation and sender_id is distinct from auth.uid();
end; $$;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

create or replace function public.get_sessions_workspace() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'status',s.status,'startsAt',s.starts_at,'duration',s.duration_minutes,'format',s.format,'requestType',s.request_type,'creditCost',s.credit_cost,
    'learnerId',s.learner_id,'learnerName',learner.full_name,'helperId',s.helper_id,'helperName',helper.full_name,'skillId',s.skill_id,'skill',sk.name,
    'offeredSkill',offered.name,'attachmentUrl',r.attachment_url,'meetingUrl',s.meeting_url,'learnerConfirmed',s.learner_confirmed_at is not null,'helperConfirmed',s.helper_confirmed_at is not null,
    'conversationId',c.id,'myPreparation',(select jsonb_build_object('notes',sp.notes,'projectLink',sp.project_link,'checklist',sp.checklist) from public.session_preparation sp where sp.session_id=s.id and sp.user_id=auth.uid()),
    'hasReviewed',exists(select 1 from public.reviews rv where rv.session_id=s.id and rv.reviewer_id=auth.uid())
  ) order by s.starts_at desc),'[]'::jsonb)
  from public.sessions s join public.profiles learner on learner.id=s.learner_id join public.profiles helper on helper.id=s.helper_id join public.skills sk on sk.id=s.skill_id join public.swap_requests r on r.id=s.swap_request_id left join public.skills offered on offered.id=r.offered_skill_id left join public.conversations c on c.swap_request_id=s.swap_request_id
  where auth.uid() in(s.learner_id,s.helper_id);
$$;
grant execute on function public.get_sessions_workspace() to authenticated;

create or replace function public.update_session_schedule(target_session uuid, new_start timestamptz, new_duration smallint, new_format text) returns void
language plpgsql security definer set search_path = '' as $$
declare sess public.sessions%rowtype; other_user uuid;
begin
  select * into sess from public.sessions where id=target_session for update;
  if sess.id is null or auth.uid() not in(sess.learner_id,sess.helper_id) or sess.status<>'scheduled' then raise exception 'Session cannot be rescheduled'; end if;
  if new_start<=now() or new_duration not in(15,30,60,90) or new_format not in('Chat','Voice','Video','Project Review') then raise exception 'Choose a valid future schedule'; end if;
  update public.sessions set starts_at=new_start,duration_minutes=new_duration,format=new_format where id=sess.id;
  perform public.add_system_message(sess.swap_request_id,'Session rescheduled for '||to_char(new_start,'Mon DD at HH12:MI AM')||' · '||new_format||'.');
  other_user:=case when auth.uid()=sess.learner_id then sess.helper_id else sess.learner_id end;
  insert into public.notifications(user_id,type,title,body,action_url) values(other_user,'session_scheduled','Session rescheduled','Your exchange has a new proposed time.','/sessions/'||sess.id);
end; $$;
grant execute on function public.update_session_schedule(uuid,timestamptz,smallint,text) to authenticated;

create or replace function public.start_session(target_session uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare sess public.sessions%rowtype;
begin
  select * into sess from public.sessions where id=target_session for update;
  if sess.id is null or auth.uid() not in(sess.learner_id,sess.helper_id) or sess.status<>'scheduled' then raise exception 'Session cannot be started'; end if;
  update public.sessions set status='in_progress' where id=sess.id;
  perform public.add_system_message(sess.swap_request_id,'The learning session started.');
end; $$;
grant execute on function public.start_session(uuid) to authenticated;

create or replace function public.save_session_preparation(target_session uuid, preparation jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.sessions s where s.id=target_session and auth.uid() in(s.learner_id,s.helper_id) and s.status in('scheduled','in_progress')) then raise exception 'Session preparation is closed'; end if;
  insert into public.session_preparation(session_id,user_id,notes,project_link,checklist) values(target_session,auth.uid(),coalesce(preparation->>'notes',''),nullif(preparation->>'project_link',''),coalesce(preparation->'checklist','[]'::jsonb))
  on conflict(session_id,user_id) do update set notes=excluded.notes,project_link=excluded.project_link,checklist=excluded.checklist,updated_at=now();
end; $$;
grant execute on function public.save_session_preparation(uuid,jsonb) to authenticated;

create or replace function public.submit_session_review(target_session uuid, stars smallint, review_tags text[], review_text text, exchange_again boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare sess public.sessions%rowtype; reviewee uuid; created_id uuid;
begin
  select * into sess from public.sessions where id=target_session;
  if sess.id is null or sess.status<>'completed' or auth.uid() not in(sess.learner_id,sess.helper_id) then raise exception 'This session cannot be reviewed'; end if;
  if stars<1 or stars>5 then raise exception 'Rating must be between 1 and 5'; end if;
  reviewee:=case when auth.uid()=sess.learner_id then sess.helper_id else sess.learner_id end;
  if review_tags <@ array['Clear explanation','Patient','Helpful','Reliable','Good communication','Practical advice','Great feedback']::text[] is not true then raise exception 'One or more review tags are invalid'; end if;
  insert into public.reviews(session_id,reviewer_id,reviewee_id,rating,tags,comment,would_exchange_again) values(sess.id,auth.uid(),reviewee,stars,coalesce(review_tags,'{}'::text[]),nullif(trim(review_text),''),exchange_again) returning id into created_id;
  insert into public.notifications(user_id,type,title,body,action_url) values(reviewee,'review_received','New review','A learning partner left you a review.','/profile/'||reviewee);
  return created_id;
end; $$;
grant execute on function public.submit_session_review(uuid,smallint,text[],text,boolean) to authenticated;

insert into public.badges(name,slug,description,icon_key) values
  ('First Exchange','first-exchange','Complete your first confirmed learning exchange.','heart-handshake'),
  ('5 Sessions Completed','five-sessions','Show up and complete five learning sessions.','calendar-check'),
  ('Great Explainer','great-explainer','Receive repeated praise for clear explanations.','lightbulb'),
  ('Reliable Helper','reliable-helper','Build a record of five reliable sessions without disputes.','shield-check'),
  ('Skill Builder','skill-builder','Mark three learning skills as improved.','blocks'),
  ('Project Reviewer','project-reviewer','Complete a project review as the helper.','file-check'),
  ('Language Partner','language-partner','Complete a learning-partner exchange.','languages'),
  ('Community Starter','community-starter','Create your first Learning Circle.','users')
on conflict(slug) do update set name=excluded.name,description=excluded.description,icon_key=excluded.icon_key;

create or replace function public.refresh_reputation(target_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare avg_rating numeric:=0; completed integer:=0; received integer:=0; answered integer:=0; cancelled integer:=0; disputed integer:=0; helpful integer:=0; score numeric:=0; response numeric:=100; no_show numeric:=0; label text;
begin
  select coalesce(avg(rating),0),coalesce(sum(cardinality(tags)),0) into avg_rating,helpful from public.reviews where reviewee_id=target_user and is_public;
  select count(*) filter(where status='completed'),count(*) filter(where status='cancelled'),count(*) filter(where status='disputed') into completed,cancelled,disputed from public.sessions where target_user in(learner_id,helper_id);
  select count(*),count(*) filter(where status<>'pending') into received,answered from public.swap_requests where recipient_id=target_user;
  response:=case when received=0 then 100 else 100.0*answered/received end;
  no_show:=case when completed+cancelled=0 then 0 else 100.0*cancelled/(completed+cancelled) end;
  score:=least(5,greatest(0,avg_rating*.55+least(completed,10)*.05+(response/100)*.5+((100-no_show)/100)*.35+least(helpful,10)*.03-disputed*.25));
  label:=case when completed=0 then 'New to the Loop' when avg_rating>=4.8 and helpful>=5 then 'Great Explainer' when response>=90 and no_show<=5 then 'Reliable Helper' when response>=90 then 'Fast Responder' when completed>=5 then 'Consistent Guide' else 'Growing Helper' end;
  update public.profiles set reputation_score=round(score,2),response_rate=round(response,2),no_show_rate=round(no_show,2),reputation_label=label where id=target_user;
end; $$;
revoke all on function public.refresh_reputation(uuid) from public,anon,authenticated;

create or replace function public.evaluate_user_badges(target_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_badges(user_id,badge_id)
  select target_user,b.id from public.badges b where
    (b.slug='first-exchange' and (select count(*) from public.sessions s where s.status='completed' and target_user in(s.learner_id,s.helper_id))>=1) or
    (b.slug='five-sessions' and (select count(*) from public.sessions s where s.status='completed' and target_user in(s.learner_id,s.helper_id))>=5) or
    (b.slug='great-explainer' and (select count(*) from public.reviews r where r.reviewee_id=target_user and 'Clear explanation'=any(r.tags))>=2) or
    (b.slug='reliable-helper' and (select count(*) from public.sessions s where s.status='completed' and s.helper_id=target_user)>=5 and not exists(select 1 from public.sessions s where s.status='disputed' and s.helper_id=target_user)) or
    (b.slug='skill-builder' and (select count(*) from public.user_learn_skills u where u.user_id=target_user and u.completed_at is not null)>=3) or
    (b.slug='project-reviewer' and exists(select 1 from public.sessions s where s.helper_id=target_user and s.request_type='project_review' and s.status='completed')) or
    (b.slug='language-partner' and exists(select 1 from public.sessions s where target_user in(s.learner_id,s.helper_id) and s.request_type='learning_partner' and s.status='completed')) or
    (b.slug='community-starter' and exists(select 1 from public.circles c where c.owner_id=target_user))
  on conflict do nothing;
end; $$;
revoke all on function public.evaluate_user_badges(uuid) from public,anon,authenticated;

create or replace function public.on_trust_event() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name='reviews' then perform public.refresh_reputation(new.reviewee_id);perform public.evaluate_user_badges(new.reviewee_id);
  elsif tg_table_name='sessions' then perform public.refresh_reputation(new.learner_id);perform public.refresh_reputation(new.helper_id);perform public.evaluate_user_badges(new.learner_id);perform public.evaluate_user_badges(new.helper_id);
  elsif tg_table_name='circles' then perform public.evaluate_user_badges(new.owner_id);end if;
  return new;
end; $$;
create trigger trust_after_review after insert on public.reviews for each row execute function public.on_trust_event();
create trigger trust_after_session after update of status on public.sessions for each row when (new.status in ('completed','cancelled','disputed')) execute function public.on_trust_event();
create trigger trust_after_circle after insert on public.circles for each row execute function public.on_trust_event();

create or replace function public.get_skill_passport(target_user uuid default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'profile',jsonb_build_object('id',p.id,'name',p.full_name,'bio',p.bio,'avatarUrl',p.avatar_url,'languages',p.languages,'timezone',p.timezone,'rating',p.reputation_score,'responseRate',p.response_rate,'noShowRate',p.no_show_rate,'reputationLabel',p.reputation_label,'sessions',p.completed_sessions),
    'goal',coalesce(pref.main_goal,''),
    'teach',coalesce((select jsonb_agg(jsonb_build_object('id',sk.id,'name',sk.name,'level',u.level,'formats',u.help_formats,'verifiedReviews',(select count(*) from public.reviews r join public.sessions s on s.id=r.session_id where r.reviewee_id=p.id and s.skill_id=sk.id))) from public.user_teach_skills u join public.skills sk on sk.id=u.skill_id where u.user_id=p.id),'[]'::jsonb),
    'learn',coalesce((select jsonb_agg(jsonb_build_object('id',sk.id,'name',sk.name,'level',u.current_level,'goal',u.goal,'completed',u.completed_at is not null)) from public.user_learn_skills u join public.skills sk on sk.id=u.skill_id where u.user_id=p.id),'[]'::jsonb),
    'creditsEarned',coalesce((select lifetime_earned from public.credits where user_id=p.id),0),
    'reviews',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'reviewer',rp.full_name,'rating',r.rating,'tags',r.tags,'comment',r.comment,'exchangeAgain',r.would_exchange_again,'createdAt',r.created_at) order by r.created_at desc) from public.reviews r join public.profiles rp on rp.id=r.reviewer_id where r.reviewee_id=p.id and r.is_public),'[]'::jsonb),
    'badges',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'slug',b.slug,'description',b.description,'icon',b.icon_key,'unlocked',ub.user_id is not null,'awardedAt',ub.awarded_at) order by ub.user_id nulls last,b.name) from public.badges b left join public.user_badges ub on ub.badge_id=b.id and ub.user_id=p.id),'[]'::jsonb),
    'timeline',(coalesce((select jsonb_agg(jsonb_build_object('type','session','title','Completed '||sk.name||' session','date',s.completed_at,'meta',s.format)) from public.sessions s join public.skills sk on sk.id=s.skill_id where s.status='completed' and p.id in(s.learner_id,s.helper_id)),'[]'::jsonb) || coalesce((select jsonb_agg(jsonb_build_object('type','badge','title','Unlocked '||b.name,'date',ub.awarded_at,'meta',b.description)) from public.user_badges ub join public.badges b on b.id=ub.badge_id where ub.user_id=p.id),'[]'::jsonb))
  ) from public.profiles p left join public.user_preferences pref on pref.user_id=p.id where p.id=coalesce(target_user,auth.uid());
$$;
grant execute on function public.get_skill_passport(uuid) to authenticated;

-- Phase 8: discovery and community actions stay behind narrow RPCs so circle
-- membership, join requests, and engagement counts cannot be forged by clients.
create or replace function public.get_circles_workspace() returns jsonb
language sql stable security definer set search_path = '' as $$
  with interests as (
    select lower(sk.name) term from public.user_teach_skills u join public.skills sk on sk.id=u.skill_id where u.user_id=auth.uid()
    union select lower(sk.name) from public.user_learn_skills u join public.skills sk on sk.id=u.skill_id where u.user_id=auth.uid()
  ), scored as (
    select c.*,
      (select count(*) from public.circle_members cm where cm.circle_id=c.id and cm.status='active') member_count,
      (select count(*) from public.circle_posts cp where cp.circle_id=c.id and cp.created_at>now()-interval '7 days') weekly_posts,
      cm.status membership_status,
      (case c.activity_level when 'Very active' then 18 when 'Active' then 12 when 'New' then 7 else 3 end
       + least(20,(select count(*) from public.circle_members x where x.circle_id=c.id and x.status='active'))
       + coalesce((select count(*)*18 from interests i where lower(c.name||' '||c.description||' '||array_to_string(c.tags,' ')) like '%'||i.term||'%'),0)
       + case when c.language=any(coalesce((select p.languages from public.profiles p where p.id=auth.uid()),'{}'::text[])) then 10 else 0 end) relevance_score
    from public.circles c left join public.circle_members cm on cm.circle_id=c.id and cm.user_id=auth.uid()
    where not c.is_private or c.owner_id=auth.uid() or public.is_circle_member(c.id)
  )
  select jsonb_build_object(
    'circles',coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'name',name,'description',description,'category',category,'circleType',circle_type,
      'language',language,'tags',tags,'rules',rules,'joinMode',join_mode,'activityLevel',activity_level,
      'memberCount',member_count,'weeklyPosts',weekly_posts,'memberLimit',member_limit,'createdAt',created_at,'coverUrl',cover_url,
      'isMember',membership_status='active','membershipStatus',membership_status,'relevanceScore',relevance_score
    ) order by relevance_score desc,member_count desc),'[]'::jsonb),
    'categories',coalesce((select jsonb_agg(category order by category) from (select distinct category from scored) q),'[]'::jsonb)
  ) from scored;
$$;
grant execute on function public.get_circles_workspace() to authenticated;

create or replace function public.get_circle_detail(target_circle uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'circle',jsonb_build_object('id',c.id,'name',c.name,'description',c.description,'category',c.category,'circleType',c.circle_type,'language',c.language,'tags',c.tags,'rules',c.rules,'joinMode',c.join_mode,'activityLevel',c.activity_level,'memberLimit',c.member_limit,'createdAt',c.created_at,'coverUrl',c.cover_url,'isMember',coalesce(me.status='active',false),'membershipStatus',me.status,'isOwner',c.owner_id=auth.uid(),'memberCount',(select count(*) from public.circle_members x where x.circle_id=c.id and x.status='active')),
    'members',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.full_name,'avatarUrl',p.avatar_url,'headline',p.headline,'reputationLabel',p.reputation_label,'role',cm.role) order by case cm.role when 'owner' then 0 when 'moderator' then 1 else 2 end,cm.joined_at) from public.circle_members cm join public.profiles p on p.id=cm.user_id where cm.circle_id=c.id and cm.status='active'),'[]'::jsonb),
    'posts',coalesce((select jsonb_agg(jsonb_build_object(
      'id',cp.id,'type',cp.post_type,'title',cp.title,'body',cp.body,'skillTag',cp.skill_tag,'createdAt',cp.created_at,
      'author',jsonb_build_object('id',pa.id,'name',pa.full_name,'avatarUrl',pa.avatar_url,'reputationLabel',pa.reputation_label),
      'helpfulCount',(select count(*) from public.circle_post_helpful h where h.post_id=cp.id),
      'hasHelpful',exists(select 1 from public.circle_post_helpful h where h.post_id=cp.id and h.user_id=auth.uid()),
      'replies',coalesce((select jsonb_agg(jsonb_build_object('id',cr.id,'body',cr.body,'createdAt',cr.created_at,'author',jsonb_build_object('id',ra.id,'name',ra.full_name,'avatarUrl',ra.avatar_url)) order by cr.created_at) from public.circle_replies cr join public.profiles ra on ra.id=cr.author_id where cr.post_id=cp.id),'[]'::jsonb)
    ) order by cp.created_at desc) from public.circle_posts cp join public.profiles pa on pa.id=cp.author_id where cp.circle_id=c.id),'[]'::jsonb),
    'rituals',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'title',r.title,'description',r.description,'cadence',r.cadence,'prompt',r.prompt) order by r.created_at) from public.circle_rituals r where r.circle_id=c.id and r.is_active),'[]'::jsonb),
    'recommendedMembers',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.full_name,'avatarUrl',p.avatar_url,'headline',p.headline,'reputationLabel',p.reputation_label) order by p.reputation_score desc) from public.circle_members cm join public.profiles p on p.id=cm.user_id where cm.circle_id=c.id and cm.status='active' and p.id<>auth.uid() limit 6),'[]'::jsonb)
  ) from public.circles c left join public.circle_members me on me.circle_id=c.id and me.user_id=auth.uid()
  where c.id=target_circle and (not c.is_private or c.owner_id=auth.uid() or public.is_circle_member(c.id));
$$;
grant execute on function public.get_circle_detail(uuid) to authenticated;

create or replace function public.create_learning_circle(payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare created_id uuid; supplied_tags text[]; supplied_rules text[];
begin
  if char_length(trim(coalesce(payload->>'name','')))<3 or char_length(trim(coalesce(payload->>'description','')))<20 then raise exception 'Add a clear name and description'; end if;
  select coalesce(array_agg(value),'{}'::text[]) into supplied_tags from jsonb_array_elements_text(coalesce(payload->'tags','[]'::jsonb));
  select coalesce(array_agg(value),array['Be generous and specific','Respect every learning level']::text[]) into supplied_rules from jsonb_array_elements_text(coalesce(payload->'rules','[]'::jsonb));
  insert into public.circles(owner_id,name,description,category,circle_type,language,tags,rules,join_mode,is_private,member_limit,cover_url)
  values(auth.uid(),trim(payload->>'name'),trim(payload->>'description'),coalesce(nullif(trim(payload->>'category'),''),'General'),coalesce(nullif(payload->>'circle_type',''),'skill'),coalesce(nullif(trim(payload->>'language'),''),'English'),supplied_tags,supplied_rules,coalesce(nullif(payload->>'join_mode',''),'public'),false,coalesce((payload->>'member_limit')::smallint,50),nullif(trim(payload->>'cover_url'),'')) returning id into created_id;
  insert into public.circle_rituals(circle_id,title,description,cadence,prompt) values
    (created_id,'Weekly feedback thread','Give one useful piece of feedback and ask for one.','Weekly','Share something you are improving this week.'),
    (created_id,'Find a partner','Pair up for a focused practice exchange.','Weekly','What can you practice together for 30 minutes?'),
    (created_id,'Share your progress','Make small wins visible and keep momentum.','Weekly','What moved forward since your last check-in?'),
    (created_id,'Ask for quick help','Unblock one specific question together.','Anytime','What is the smallest useful answer you need?');
  return created_id;
end; $$;
grant execute on function public.create_learning_circle(jsonb) to authenticated;

create or replace function public.join_learning_circle(target_circle uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare target public.circles%rowtype; next_status text;
begin
  select * into target from public.circles where id=target_circle for update;
  if target.id is null or target.is_private then raise exception 'Circle is not open for joining'; end if;
  if (select count(*) from public.circle_members where circle_id=target.id and status='active')>=target.member_limit then raise exception 'Circle is full'; end if;
  next_status:=case when target.join_mode='request' then 'pending' else 'active' end;
  insert into public.circle_members(circle_id,user_id,role,status) values(target.id,auth.uid(),'member',next_status)
  on conflict(circle_id,user_id) do update set status=excluded.status,joined_at=now();
  if next_status='pending' then insert into public.notifications(user_id,type,title,body,action_url) values(target.owner_id,'circle_join_request','New circle join request','Someone wants to join '||target.name||'.','/circles/'||target.id); end if;
  return next_status;
end; $$;
grant execute on function public.join_learning_circle(uuid) to authenticated;

create or replace function public.leave_learning_circle(target_circle uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.circles where id=target_circle and owner_id=auth.uid()) then raise exception 'Circle owners cannot leave their circle'; end if;
  delete from public.circle_members where circle_id=target_circle and user_id=auth.uid();
end; $$;
grant execute on function public.leave_learning_circle(uuid) to authenticated;

create or replace function public.create_circle_post(target_circle uuid, kind public.circle_post_type, post_title text, post_body text, tag text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare created_id uuid;
begin
  if not public.is_circle_member(target_circle) then raise exception 'Join this circle before posting'; end if;
  insert into public.circle_posts(circle_id,author_id,post_type,title,body,skill_tag) values(target_circle,auth.uid(),kind,trim(post_title),trim(post_body),nullif(trim(tag),'')) returning id into created_id;
  return created_id;
end; $$;
grant execute on function public.create_circle_post(uuid,public.circle_post_type,text,text,text) to authenticated;

create or replace function public.reply_to_circle_post(target_post uuid, reply_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare created_id uuid; target_circle uuid;
begin
  select circle_id into target_circle from public.circle_posts where id=target_post;
  if target_circle is null or not public.is_circle_member(target_circle) then raise exception 'Join this circle before replying'; end if;
  insert into public.circle_replies(post_id,author_id,body) values(target_post,auth.uid(),trim(reply_body)) returning id into created_id;
  return created_id;
end; $$;
grant execute on function public.reply_to_circle_post(uuid,text) to authenticated;

create or replace function public.toggle_circle_post_helpful(target_post uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare target_circle uuid;
begin
  select circle_id into target_circle from public.circle_posts where id=target_post;
  if target_circle is null or not public.is_circle_member(target_circle) then raise exception 'Join this circle to mark posts helpful'; end if;
  if exists(select 1 from public.circle_post_helpful where post_id=target_post and user_id=auth.uid()) then delete from public.circle_post_helpful where post_id=target_post and user_id=auth.uid();return false;end if;
  insert into public.circle_post_helpful(post_id,user_id) values(target_post,auth.uid());return true;
end; $$;
grant execute on function public.toggle_circle_post_helpful(uuid) to authenticated;

create or replace function public.report_circle_content(target_post uuid, target_reply uuid, report_reason text, report_details text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare created_id uuid; reported uuid;
begin
  if (target_post is null)=(target_reply is null) then raise exception 'Choose one item to report'; end if;
  select author_id into reported from public.circle_posts where id=target_post;
  if target_reply is not null then select author_id into reported from public.circle_replies where id=target_reply; end if;
  if reported is null or reported=auth.uid() then raise exception 'This content cannot be reported'; end if;
  insert into public.reports(reporter_id,reported_user_id,circle_post_id,circle_reply_id,reason,details) values(auth.uid(),reported,target_post,target_reply,case when trim(report_reason) in ('spam','harassment','fake profile','scam','no-show','inappropriate content','unsafe behavior','other') then trim(report_reason) else 'other' end,nullif(trim(report_details),'')) returning id into created_id;
  return created_id;
end; $$;
grant execute on function public.report_circle_content(uuid,uuid,text,text) to authenticated;

-- Phase 9: unified safety reporting, blocking, and administrator control plane.
create or replace function public.submit_safety_report(report_payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare kind text:=report_payload->>'target_type'; target uuid:=(report_payload->>'target_id')::uuid; reason_value text:=report_payload->>'reason'; reported uuid; created_id uuid;
begin
  if reason_value not in ('spam','harassment','fake profile','scam','no-show','inappropriate content','unsafe behavior','other') then raise exception 'Invalid report reason'; end if;
  if kind='profile' then reported:=target;
  elsif kind='message' then select sender_id into reported from public.messages where id=target;
  elsif kind='session' then select case when learner_id=auth.uid() then helper_id else learner_id end into reported from public.sessions where id=target and auth.uid() in(learner_id,helper_id);
  elsif kind='review' then select reviewer_id into reported from public.reviews where id=target;
  elsif kind='circle_post' then select author_id into reported from public.circle_posts where id=target;
  elsif kind='circle_reply' then select author_id into reported from public.circle_replies where id=target;
  else raise exception 'Invalid report target'; end if;
  if reported is null or reported=auth.uid() then raise exception 'This item cannot be reported'; end if;
  insert into public.reports(reporter_id,reported_user_id,session_id,message_id,review_id,circle_post_id,circle_reply_id,reason,details)
  values(auth.uid(),reported,case when kind='session' then target end,case when kind='message' then target end,case when kind='review' then target end,case when kind='circle_post' then target end,case when kind='circle_reply' then target end,reason_value,nullif(trim(report_payload->>'details'),'')) returning id into created_id;
  return created_id;
end; $$;
grant execute on function public.submit_safety_report(jsonb) to authenticated;

create or replace function public.toggle_user_block(target_user uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if target_user=auth.uid() or not exists(select 1 from public.profiles where id=target_user) then raise exception 'User cannot be blocked'; end if;
  if exists(select 1 from public.blocked_users where blocker_id=auth.uid() and blocked_id=target_user) then delete from public.blocked_users where blocker_id=auth.uid() and blocked_id=target_user;return false;end if;
  insert into public.blocked_users(blocker_id,blocked_id) values(auth.uid(),target_user);return true;
end; $$;
grant execute on function public.toggle_user_block(uuid) to authenticated;

create or replace function public.flag_session_no_show(target_session uuid, target_user uuid, details text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare created_id uuid;
begin
  if not exists(select 1 from public.sessions where id=target_session and auth.uid() in(learner_id,helper_id) and target_user in(learner_id,helper_id) and target_user<>auth.uid()) then raise exception 'Session cannot be flagged'; end if;
  insert into public.no_show_flags(session_id,reported_user_id,reporter_id) values(target_session,target_user,auth.uid()) returning id into created_id;
  insert into public.reports(reporter_id,reported_user_id,session_id,reason,details) values(auth.uid(),target_user,target_session,'no-show',nullif(trim(details),''));
  return created_id;
end; $$;
grant execute on function public.flag_session_no_show(uuid,uuid,text) to authenticated;

create or replace function public.get_admin_workspace() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select jsonb_build_object(
    'stats',jsonb_build_object(
      'totalUsers',(select count(*) from public.profiles),
      'newUsers',(select count(*) from public.profiles where created_at>now()-interval '7 days'),
      'activeSessions',(select count(*) from public.sessions where status in('scheduled','in_progress')),
      'completedSessions',(select count(*) from public.sessions where status='completed'),
      'openReports',(select count(*) from public.reports where status in('open','reviewing')),
      'disputes',(select count(*) from public.sessions where status='disputed'),
      'creditTransactions',(select count(*) from public.credit_transactions),
      'activeCircles',(select count(*) from public.circles)
    ),
    'users',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.full_name,'email',u.email,'role',p.role,'status',p.account_status,'verified',p.is_verified,'warnings',p.warning_count,'rating',p.reputation_score,'sessions',p.completed_sessions,'credits',coalesce(c.balance,0),'reports',(select count(*) from public.reports r where r.reported_user_id=p.id),'createdAt',p.created_at,'lastActiveAt',p.last_active_at) order by p.created_at desc) from public.profiles p left join auth.users u on u.id=p.id left join public.credits c on c.user_id=p.id),'[]'::jsonb),
    'reports',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'reason',r.reason,'details',r.details,'status',r.status,'createdAt',r.created_at,'reporterId',r.reporter_id,'reporterName',rp.full_name,'reportedUserId',r.reported_user_id,'reportedUserName',up.full_name,'contentType',case when r.message_id is not null then 'message' when r.review_id is not null then 'review' when r.circle_post_id is not null then 'circle_post' when r.circle_reply_id is not null then 'circle_reply' when r.session_id is not null then 'session' else 'profile' end,'targetId',coalesce(r.message_id,r.review_id,r.circle_post_id,r.circle_reply_id,r.session_id,r.reported_user_id)) order by r.created_at desc) from public.reports r join public.profiles rp on rp.id=r.reporter_id left join public.profiles up on up.id=r.reported_user_id),'[]'::jsonb),
    'disputes',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'skill',sk.name,'learnerId',s.learner_id,'learnerName',lp.full_name,'helperId',s.helper_id,'helperName',hp.full_name,'requestMessage',sr.message,'creditCost',s.credit_cost,'creditStatus',(select max(ct.status::text) from public.credit_transactions ct where ct.related_session_id=s.id),'startsAt',s.starts_at,'createdAt',s.created_at) order by s.created_at desc) from public.sessions s join public.skills sk on sk.id=s.skill_id join public.profiles lp on lp.id=s.learner_id join public.profiles hp on hp.id=s.helper_id join public.swap_requests sr on sr.id=s.swap_request_id where s.status='disputed'),'[]'::jsonb),
    'transactions',coalesce((select jsonb_agg(jsonb_build_object('id',ct.id,'userId',ct.user_id,'userName',p.full_name,'amount',ct.amount,'type',ct.type,'reason',ct.reason,'status',ct.status,'balanceAfter',ct.balance_after,'sessionId',ct.related_session_id,'suspicious',abs(ct.amount)>=3 or ct.type='adjustment','createdAt',ct.created_at) order by ct.created_at desc) from public.credit_transactions ct join public.profiles p on p.id=ct.user_id),'[]'::jsonb),
    'circles',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'ownerId',c.owner_id,'ownerName',p.full_name,'members',(select count(*) from public.circle_members cm where cm.circle_id=c.id and cm.status='active'),'posts',(select count(*) from public.circle_posts cp where cp.circle_id=c.id),'createdAt',c.created_at) order by c.created_at desc) from public.circles c join public.profiles p on p.id=c.owner_id),'[]'::jsonb),
    'reviews',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'reviewerName',a.full_name,'revieweeName',b.full_name,'rating',r.rating,'comment',r.comment,'public',r.is_public,'createdAt',r.created_at) order by r.created_at desc) from public.reviews r join public.profiles a on a.id=r.reviewer_id join public.profiles b on b.id=r.reviewee_id),'[]'::jsonb),
    'skills',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'category',s.category,'active',s.is_active,'teachers',(select count(*) from public.user_teach_skills u where u.skill_id=s.id),'learners',(select count(*) from public.user_learn_skills u where u.skill_id=s.id)) order by s.category,s.name) from public.skills s),'[]'::jsonb),
    'audit',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'adminName',p.full_name,'action',m.action,'targetType',m.target_type,'targetId',m.target_id,'note',m.note,'createdAt',m.created_at) order by m.created_at desc) from public.moderation_actions m join public.profiles p on p.id=m.admin_id),'[]'::jsonb)
  ) into result;
  return result;
end; $$;
grant execute on function public.get_admin_workspace() to authenticated;

create or replace function public.get_admin_user_detail(target_user uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select jsonb_build_object(
    'profile',jsonb_build_object('id',p.id,'name',p.full_name,'bio',p.bio,'status',p.account_status,'verified',p.is_verified,'warnings',p.warning_count,'createdAt',p.created_at),
    'sessions',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'skill',sk.name,'status',s.status,'role',case when s.learner_id=p.id then 'learner' else 'helper' end,'partner',case when s.learner_id=p.id then hp.full_name else lp.full_name end,'startsAt',s.starts_at) order by s.starts_at desc) from public.sessions s join public.skills sk on sk.id=s.skill_id join public.profiles lp on lp.id=s.learner_id join public.profiles hp on hp.id=s.helper_id where p.id in(s.learner_id,s.helper_id)),'[]'::jsonb),
    'transactions',coalesce((select jsonb_agg(jsonb_build_object('id',ct.id,'amount',ct.amount,'type',ct.type,'reason',ct.reason,'status',ct.status,'balanceAfter',ct.balance_after,'createdAt',ct.created_at) order by ct.created_at desc) from public.credit_transactions ct where ct.user_id=p.id),'[]'::jsonb),
    'reports',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'reason',r.reason,'details',r.details,'status',r.status,'createdAt',r.created_at) order by r.created_at desc) from public.reports r where r.reported_user_id=p.id),'[]'::jsonb)
  ) into result from public.profiles p where p.id=target_user;
  return result;
end; $$;
grant execute on function public.get_admin_user_detail(uuid) to authenticated;

create or replace function public.admin_moderate(action_name text, target_type text, target_id uuid, action_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare report_row public.reports%rowtype;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if action_name='verify_user' and target_type='user' then update public.profiles set is_verified=true where id=target_id;
  elsif action_name='suspend_user' and target_type='user' then
    if target_id=auth.uid() then raise exception 'You cannot suspend your own account'; end if;
    update public.profiles set account_status='suspended',suspended_at=now(),suspended_by=auth.uid(),suspension_reason=action_note where id=target_id;
    insert into public.notifications(user_id,type,title,body,action_url) values(target_id,'account_suspended','Account suspended','Your account has been restricted. Contact support if you believe this is a mistake.','/profile');
  elsif action_name='unsuspend_user' and target_type='user' then update public.profiles set account_status='active',suspended_at=null,suspended_by=null,suspension_reason=null where id=target_id;
  elsif action_name='warn_user' and target_type='user' then
    update public.profiles set warning_count=warning_count+1 where id=target_id;
    insert into public.notifications(user_id,type,title,body,action_url) values(target_id,'safety_warning','Safety warning',coalesce(action_note,'Please review the SkillLoop community guidelines.'),'/profile');
  elsif action_name in('resolve_report','dismiss_report') and target_type='report' then update public.reports set status=case when action_name='resolve_report' then 'resolved'::public.report_status else 'dismissed'::public.report_status end,reviewed_by=auth.uid(),resolution_note=action_note where id=target_id;
  elsif action_name='remove_content' and target_type='report' then
    select * into report_row from public.reports where id=target_id for update;
    if report_row.message_id is not null then delete from public.messages where id=report_row.message_id;
    elsif report_row.review_id is not null then update public.reviews set is_public=false where id=report_row.review_id;
    elsif report_row.circle_post_id is not null then delete from public.circle_posts where id=report_row.circle_post_id;
    elsif report_row.circle_reply_id is not null then delete from public.circle_replies where id=report_row.circle_reply_id;
    else raise exception 'Report has no removable content'; end if;
    update public.reports set status='resolved',reviewed_by=auth.uid(),resolution_note=coalesce(action_note,'Content removed') where id=target_id;
  elsif action_name='remove_review' and target_type='review' then update public.reviews set is_public=false where id=target_id;
  elsif action_name='remove_circle' and target_type='circle' then delete from public.circles where id=target_id;
  elsif action_name in('deactivate_skill','activate_skill') and target_type='skill' then update public.skills set is_active=action_name='activate_skill' where id=target_id;
  elsif action_name in('refund_credits','release_credits') and target_type='session' then perform public.resolve_disputed_session(target_id,case when action_name='refund_credits' then 'refund' else 'release' end);
  elsif action_name in('confirm_no_show','dismiss_no_show') and target_type='no_show' then
    update public.no_show_flags set status=case when action_name='confirm_no_show' then 'confirmed' else 'dismissed' end,confirmed_by=auth.uid() where id=target_id;
    if action_name='confirm_no_show' then update public.profiles set warning_count=warning_count+1 where id=(select reported_user_id from public.no_show_flags where id=target_id); end if;
  else raise exception 'Unsupported moderation action'; end if;
  insert into public.moderation_actions(admin_id,action,target_type,target_id,note) values(auth.uid(),action_name,target_type,target_id,nullif(trim(action_note),''));
end; $$;
grant execute on function public.admin_moderate(text,text,uuid,text) to authenticated;

-- Bootstrap the first operator from the Supabase SQL editor after signup:
-- update public.profiles set role='admin', is_admin=true where id='<auth-user-id>';

-- Phase 10: activation, referrals, and public sharing.
insert into public.badges(name,slug,description,icon_key) values
  ('Loop Activated','loop-activated','Complete the five steps that create a durable learning loop.','sparkles')
on conflict(slug) do update set name=excluded.name,description=excluded.description,icon_key=excluded.icon_key;

create or replace function public.refresh_user_activation(target_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare teach_done boolean;learn_done boolean;sent_done boolean;received_done boolean;circle_done boolean;exchange_done boolean;credit_done boolean;
begin
  select exists(select 1 from public.user_teach_skills where user_id=target_user),exists(select 1 from public.user_learn_skills where user_id=target_user),exists(select 1 from public.swap_requests where requester_id=target_user),exists(select 1 from public.swap_requests where recipient_id=target_user),exists(select 1 from public.circle_members where user_id=target_user and status='active'),exists(select 1 from public.sessions where target_user in(learner_id,helper_id) and status='completed'),exists(select 1 from public.credit_transactions where user_id=target_user and type='earned' and status='completed') into teach_done,learn_done,sent_done,received_done,circle_done,exchange_done,credit_done;
  insert into public.activation_events(user_id,event_key)
  select target_user,event_key from (values('teach_skill',teach_done),('learn_skill',learn_done),('sent_request',sent_done),('received_request',received_done),('joined_circle',circle_done),('completed_exchange',exchange_done),('earned_credit',credit_done)) e(event_key,done) where done on conflict do nothing;
  if sent_done or received_done or circle_done or exchange_done or credit_done then update public.profiles set activated_at=coalesce(activated_at,now()) where id=target_user;end if;
  if teach_done and learn_done and sent_done and circle_done and exchange_done then
    insert into public.activation_events(user_id,event_key) values(target_user,'checklist_complete') on conflict do nothing;
    insert into public.user_badges(user_id,badge_id) select target_user,id from public.badges where slug='loop-activated' on conflict do nothing;
  end if;
end; $$;
revoke all on function public.refresh_user_activation(uuid) from public,anon,authenticated;

create or replace function public.on_activation_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name in('user_teach_skills','user_learn_skills','circle_members','credit_transactions') then perform public.refresh_user_activation(new.user_id);
  elsif tg_table_name='swap_requests' then perform public.refresh_user_activation(new.requester_id);perform public.refresh_user_activation(new.recipient_id);
  elsif tg_table_name='sessions' then perform public.refresh_user_activation(new.learner_id);perform public.refresh_user_activation(new.helper_id);end if;
  return new;
end; $$;
create trigger activation_after_teach after insert on public.user_teach_skills for each row execute function public.on_activation_event();
create trigger activation_after_learn after insert on public.user_learn_skills for each row execute function public.on_activation_event();
create trigger activation_after_request after insert on public.swap_requests for each row execute function public.on_activation_event();
create trigger activation_after_circle after insert or update of status on public.circle_members for each row execute function public.on_activation_event();
create trigger activation_after_session after insert or update of status on public.sessions for each row execute function public.on_activation_event();
create trigger activation_after_credit after insert or update of status on public.credit_transactions for each row execute function public.on_activation_event();

create or replace function public.queue_notification_email() returns trigger
language plpgsql security definer set search_path = '' as $$
declare recipient text;email_enabled boolean;
begin
  if new.type not in('swap_request','request_accepted','new_message','confirmation_waiting','credits_earned','review_prompt','referral_joined') then return new;end if;
  select coalesce((notification_settings->>case when new.type in('swap_request','request_accepted') then 'email_requests' when new.type='new_message' then 'email_messages' when new.type in('confirmation_waiting','review_prompt') then 'email_sessions' when new.type='credits_earned' then 'email_credits' else 'email_community' end)::boolean,true) into email_enabled from public.user_preferences where user_id=new.user_id;
  if coalesce(email_enabled,true)=false then return new;end if;
  select email into recipient from auth.users where id=new.user_id;
  if recipient is not null then insert into public.email_outbox(user_id,notification_id,recipient_email,event_type,subject,body) values(new.user_id,new.id,recipient,new.type,new.title,new.body);end if;
  return new;
end; $$;
create trigger notification_email_queue after insert on public.notifications for each row execute function public.queue_notification_email();

create or replace function public.apply_referral(code text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare inviter uuid;invitee uuid:=auth.uid();inviter_balance integer;invitee_balance integer;
begin
  if invitee is null or not exists(select 1 from public.profiles where id=invitee and onboarding_complete) then raise exception 'Complete onboarding before claiming an invite';end if;
  select id into inviter from public.profiles where referral_code=upper(trim(code));
  if inviter is null or inviter=invitee then return false;end if;
  if exists(select 1 from public.referrals where invitee_id=invitee) then return false;end if;
  insert into public.referrals(inviter_id,invitee_id,referral_code,status,rewarded_at) values(inviter,invitee,upper(trim(code)),'rewarded',now());
  update public.profiles set referred_by=inviter where id=invitee;
  update public.credits set balance=balance+1 where user_id=inviter returning balance into inviter_balance;
  update public.credits set balance=balance+1 where user_id=invitee returning balance into invitee_balance;
  insert into public.credit_transactions(user_id,type,amount,balance_after,reason,status) values(inviter,'bonus',1,inviter_balance,'Referral reward','completed'),(invitee,'bonus',1,invitee_balance,'Welcome referral reward','completed');
  insert into public.notifications(user_id,type,title,body,action_url) values(inviter,'referral_joined','Your invite joined','A friend completed onboarding. You both earned 1 Skill Credit.','/dashboard'),(invitee,'credits_earned','Referral credit received','You and your friend each earned 1 Skill Credit.','/wallet');
  return true;
end; $$;
grant execute on function public.apply_referral(text) to authenticated;

create or replace function public.get_growth_workspace() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'username',p.username,'referralCode',p.referral_code,'activated',p.activated_at is not null,'activatedAt',p.activated_at,
    'checklist',jsonb_build_object('teachSkill',exists(select 1 from public.user_teach_skills where user_id=p.id),'learnSkill',exists(select 1 from public.user_learn_skills where user_id=p.id),'sentRequest',exists(select 1 from public.swap_requests where requester_id=p.id),'joinedCircle',exists(select 1 from public.circle_members where user_id=p.id and status='active'),'completedExchange',exists(select 1 from public.sessions where p.id in(learner_id,helper_id) and status='completed')),
    'referrals',jsonb_build_object('joined',(select count(*) from public.referrals where inviter_id=p.id),'rewarded',(select count(*) from public.referrals where inviter_id=p.id and status='rewarded'),'creditsEarned',(select count(*) from public.referrals where inviter_id=p.id and status='rewarded')),
    'publicRequests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'slug',r.slug,'neededSkill',r.needed_skill,'offeredSkill',r.offered_skill,'message',r.message,'status',r.status,'views',r.view_count,'createdAt',r.created_at) order by r.created_at desc) from public.public_help_requests r where r.owner_id=p.id),'[]'::jsonb)
  ) from public.profiles p where p.id=auth.uid();
$$;
grant execute on function public.get_growth_workspace() to authenticated;

create or replace function public.create_public_help_request(needed text,offered text,content text) returns text
language plpgsql security definer set search_path = '' as $$
declare generated_slug text;
begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  generated_slug:=trim(both '-' from regexp_replace(lower(needed),'[^a-z0-9]+','-','g'))||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,8);
  insert into public.public_help_requests(owner_id,slug,needed_skill,offered_skill,message) values(auth.uid(),generated_slug,trim(needed),nullif(trim(offered),''),trim(content));
  return generated_slug;
end; $$;
grant execute on function public.create_public_help_request(text,text,text) to authenticated;

create or replace function public.get_public_help_request(request_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',r.id,'slug',r.slug,'neededSkill',r.needed_skill,'offeredSkill',r.offered_skill,'message',r.message,'createdAt',r.created_at,'owner',jsonb_build_object('id',p.id,'name',p.full_name,'username',p.username,'avatarUrl',p.avatar_url,'bio',p.bio,'reputationLabel',p.reputation_label,'sessions',p.completed_sessions)) from public.public_help_requests r join public.profiles p on p.id=r.owner_id where r.slug=request_slug and r.status='active' and r.expires_at>now() and p.account_status='active';
$$;
grant execute on function public.get_public_help_request(text) to anon,authenticated;

create or replace function public.get_public_passport(public_username text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.get_skill_passport(p.id) from public.profiles p left join public.user_preferences pref on pref.user_id=p.id where p.username=lower(public_username) and p.account_status='active' and coalesce(pref.profile_visibility,'public')='public';
$$;
grant execute on function public.get_public_passport(text) to anon,authenticated;

-- ============================================================
-- Storage: user avatar uploads
-- Public-read bucket, 2 MB limit, common image types only.
-- Each user may only write inside a folder named after their own uid.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "Users upload their own avatar" on storage.objects;
create policy "Users upload their own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update their own avatar" on storage.objects;
create policy "Users update their own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their own avatar" on storage.objects;
create policy "Users delete their own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Circle cover images: public-read bucket, 4 MB limit, owner-folder writes only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('circle-covers', 'circle-covers', true, 4194304, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Circle covers are publicly readable" on storage.objects;
create policy "Circle covers are publicly readable" on storage.objects
  for select using (bucket_id = 'circle-covers');

drop policy if exists "Users upload their own circle cover" on storage.objects;
create policy "Users upload their own circle cover" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'circle-covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update their own circle cover" on storage.objects;
create policy "Users update their own circle cover" on storage.objects
  for update to authenticated
  using (bucket_id = 'circle-covers' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'circle-covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their own circle cover" on storage.objects;
create policy "Users delete their own circle cover" on storage.objects
  for delete to authenticated
  using (bucket_id = 'circle-covers' and (storage.foldername(name))[1] = auth.uid()::text);

-- Project attachments (shared on requests): public-read bucket, 8 MB limit, images + PDF.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif','application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Attachments are publicly readable" on storage.objects;
create policy "Attachments are publicly readable" on storage.objects
  for select using (bucket_id = 'attachments');

drop policy if exists "Users upload their own attachments" on storage.objects;
create policy "Users upload their own attachments" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update their own attachments" on storage.objects;
create policy "Users update their own attachments" on storage.objects
  for update to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their own attachments" on storage.objects;
create policy "Users delete their own attachments" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- Realtime: enable live updates for chat and notifications.
-- The frontend subscribes to postgres_changes on these tables,
-- so they must belong to the supabase_realtime publication.
-- Idempotent: only adds a table if it is not already published.
-- ============================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
      alter publication supabase_realtime add table public.messages;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end $$;
