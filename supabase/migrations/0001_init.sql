-- MailSwipe core schema
-- Run via `supabase db push` or the Supabase SQL editor.

create extension if not exists pgcrypto;

-- One row per connected IMAP mailbox. Only edge functions (service_role)
-- may read/write this table; the password is stored symmetrically
-- encrypted with a server-only secret (MAILSWIPE_ENCRYPTION_KEY) so it is
-- never readable through the client's anon/authenticated Supabase key.
create table if not exists public.imap_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email_address text not null,
  imap_host text not null,
  imap_port integer not null default 993,
  use_tls boolean not null default true,
  username text not null,
  -- base64(iv || ciphertext || authTag) produced by AES-GCM using the
  -- MAILSWIPE_ENCRYPTION_KEY secret, set/read only by edge functions.
  password_encrypted text not null,
  created_at timestamptz not null default now()
);

alter table public.imap_accounts enable row level security;
-- Intentionally no policies: only the service_role key (used by edge
-- functions) bypasses RLS. Client apps never talk to this table directly.

create index if not exists imap_accounts_user_id_idx on public.imap_accounts (user_id);

-- Cached message metadata used to render swipe cards without hitting the
-- IMAP server on every card.
create table if not exists public.cached_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.imap_accounts (id) on delete cascade,
  uid integer not null,
  folder text not null default 'INBOX',
  from_name text not null default '',
  from_address text not null default '',
  subject text not null default '',
  snippet text not null default '',
  received_at timestamptz,
  size_bytes integer not null default 0,
  is_unread boolean not null default false,
  swiped boolean not null default false,
  created_at timestamptz not null default now(),
  unique (account_id, folder, uid)
);

alter table public.cached_emails enable row level security;

create policy "Users can read their own cached emails"
  on public.cached_emails for select
  using (auth.uid() = user_id);

create index if not exists cached_emails_user_unswiped_idx
  on public.cached_emails (user_id, swiped, received_at desc);

-- One row per swipe, for auditing / undo / future analytics.
create table if not exists public.swipe_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email_id uuid not null references public.cached_emails (id) on delete cascade,
  action text not null check (action in ('keep', 'archive', 'delete', 'spam')),
  created_at timestamptz not null default now()
);

alter table public.swipe_actions enable row level security;

create policy "Users can read their own swipe history"
  on public.swipe_actions for select
  using (auth.uid() = user_id);

-- Aggregated, denormalized stats for fast reads + streak/gamification logic.
create table if not exists public.user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_swiped integer not null default 0,
  total_deleted integer not null default 0,
  total_archived integer not null default 0,
  total_kept integer not null default 0,
  total_spam integer not null default 0,
  bytes_freed bigint not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_swipe_date date,
  daily_goal integer not null default 30,
  swiped_today integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_stats enable row level security;

create policy "Users can read their own stats"
  on public.user_stats for select
  using (auth.uid() = user_id);
