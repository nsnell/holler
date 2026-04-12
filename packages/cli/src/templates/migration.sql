-- ============================================
-- Holler Schema
-- Run via: npx @holler/init
-- ============================================

create extension if not exists "uuid-ossp";

-- ============================================
-- SITES table
-- ============================================
create table if not exists holler_sites (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  allowed_origins text[] default '{}',
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- ============================================
-- COMMENTS table
-- ============================================
create table if not exists holler_comments (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references holler_sites(id) on delete cascade,

  page_path text not null default '/',
  x_percent float not null,
  y_percent float not null,
  viewport_width int,

  body text not null,

  author_id uuid references auth.users(id),
  author_display_name text,
  author_avatar_url text,

  parent_id uuid references holler_comments(id) on delete cascade,

  resolved boolean default false,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,

  element_selector text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_comments_site_page
  on holler_comments(site_id, page_path);

create index if not exists idx_comments_parent
  on holler_comments(parent_id);

-- ============================================
-- REACTIONS table
-- ============================================
create table if not exists holler_reactions (
  id uuid primary key default uuid_generate_v4(),
  comment_id uuid not null references holler_comments(id) on delete cascade,
  author_id uuid references auth.users(id),
  emoji text not null,
  created_at timestamptz default now(),
  unique(comment_id, author_id, emoji)
);

-- ============================================
-- Real-time
-- ============================================
do $$
begin
  begin
    alter publication supabase_realtime add table holler_comments;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table holler_reactions;
  exception when duplicate_object then null;
  end;
end $$;

-- ============================================
-- Row Level Security
-- ============================================

alter table holler_sites enable row level security;

do $$ begin
  create policy "Public read sites"
    on holler_sites for select
    using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Authenticated users create sites"
    on holler_sites for insert
    with check (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Site creator can update"
    on holler_sites for update
    using (auth.uid() = created_by);
exception when duplicate_object then null; end $$;

alter table holler_comments enable row level security;

do $$ begin
  create policy "Public read comments"
    on holler_comments for select
    using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Authenticated users create comments"
    on holler_comments for insert
    with check (auth.uid() = author_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Authors can update own comments"
    on holler_comments for update
    using (auth.uid() = author_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Site owners can resolve comments"
    on holler_comments for update
    using (
      exists (
        select 1 from holler_sites
        where id = holler_comments.site_id
        and created_by = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

alter table holler_reactions enable row level security;

do $$ begin
  create policy "Public read reactions"
    on holler_reactions for select
    using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Authenticated users add reactions"
    on holler_reactions for insert
    with check (auth.uid() = author_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users delete own reactions"
    on holler_reactions for delete
    using (auth.uid() = author_id);
exception when duplicate_object then null; end $$;
