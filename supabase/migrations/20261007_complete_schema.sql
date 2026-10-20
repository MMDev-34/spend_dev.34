-- ==============================================================================
-- Supabase PostgreSQL Complete Migration Schema for SpendTracker
-- Version: 2026.10.07_v2
-- Description: Production-grade schema with UUIDs, RLS, Foreign Keys & Indexes
-- ==============================================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  avatar text,
  avatar_bg text default 'from-emerald-500 to-teal-700',
  phone text,
  bio text,
  monthly_budget_goal integer,
  currency text default '₹',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. USER SETTINGS TABLE
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  currency text default '₹' not null,
  theme text default 'dark' not null check (theme in ('dark', 'light', 'system')),
  week_starts_on text default 'monday' not null check (week_starts_on in ('monday', 'sunday')),
  number_format text default 'comma' not null check (number_format in ('comma', 'dot', 'space')),
  overall_monthly_budget integer,
  hide_sensitive_balances boolean default false not null,
  confirm_before_delete boolean default true not null,
  show_decimals boolean default true not null,
  default_payment_method text default 'upi' not null check (default_payment_method in ('upi', 'cash', 'card', 'bank', 'other')),
  budget_alert_threshold integer default 85 not null,
  enable_unwanted_spend_tracking boolean default true not null,
  auto_backup_reminder text default 'weekly' not null check (auto_backup_reminder in ('off', 'weekly', 'monthly')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. CATEGORIES TABLE
create table if not exists public.categories (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null,
  color text default '#10B981' not null,
  type text default 'expense' not null check (type in ('expense', 'income', 'both')),
  is_default boolean default false not null,
  monthly_budget integer,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 4. TRANSACTIONS TABLE
create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  amount integer not null, -- integer minor units (e.g. ₹250.50 -> 25050)
  category_id text not null,
  date text not null, -- YYYY-MM-DD
  note text,
  payment_method text default 'upi',
  is_unwanted boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 5. PEOPLE TABLE (For debt tracking)
create table if not exists public.people (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 6. LOANS / DEBTS TABLE
create table if not exists public.loans (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null,
  person_name text,
  direction text not null check (direction in ('lent', 'borrowed')),
  amount integer not null, -- minor units
  description text,
  date text not null, -- YYYY-MM-DD
  due_date text,
  repayments jsonb default '[]'::jsonb not null,
  settled_amount integer default 0 not null,
  is_settled boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 7. CATEGORY BUDGETS TABLE
create table if not exists public.category_budgets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id text not null,
  amount integer not null, -- minor units
  duration text default 'monthly' not null check (duration in ('weekly', 'monthly', 'yearly')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 8. RECURRING EXPENSES TABLE
create table if not exists public.recurring_expenses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount integer not null, -- minor units
  frequency text default 'monthly' not null check (frequency in ('monthly', 'weekly', 'biweekly', 'yearly')),
  due_day integer not null check (due_day between 1 and 31),
  due_month integer check (due_month between 1 and 12),
  due_weekday integer check (due_weekday between 0 and 6),
  category_id text not null,
  start_date text,
  end_date text,
  notes text,
  reminder_days_before integer default 1,
  auto_remind boolean default true not null,
  is_paused boolean default false not null,
  paid_dates jsonb default '[]'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 9. PLANNED FUTURE EXPENSES TABLE
create table if not exists public.planned_expenses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount integer not null, -- minor units
  target_date text not null,
  category_id text not null,
  is_paid boolean default false not null,
  paid_transaction_id text,
  reminder_days_before integer default 3,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
create index if not exists idx_transactions_user_date on public.transactions(user_id, date desc);
create index if not exists idx_transactions_user_cat on public.transactions(user_id, category_id);
create index if not exists idx_categories_user on public.categories(user_id);
create index if not exists idx_loans_user on public.loans(user_id);
create index if not exists idx_people_user on public.people(user_id);
create index if not exists idx_budgets_user on public.category_budgets(user_id);
create index if not exists idx_recurring_user on public.recurring_expenses(user_id);
create index if not exists idx_planned_user on public.planned_expenses(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.people enable row level security;
alter table public.loans enable row level security;
alter table public.category_budgets enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.planned_expenses enable row level security;

-- Profiles Policies
drop policy if exists "Profiles are accessible by owner" on public.profiles;
create policy "Profiles are accessible by owner" on public.profiles for all using (auth.uid() = id);

-- Settings Policies
drop policy if exists "Settings are accessible by owner" on public.user_settings;
create policy "Settings are accessible by owner" on public.user_settings for all using (auth.uid() = user_id);

-- Categories Policies
drop policy if exists "Categories are accessible by owner" on public.categories;
create policy "Categories are accessible by owner" on public.categories for all using (auth.uid() = user_id);

-- Transactions Policies
drop policy if exists "Transactions are accessible by owner" on public.transactions;
create policy "Transactions are accessible by owner" on public.transactions for all using (auth.uid() = user_id);

-- People Policies
drop policy if exists "People are accessible by owner" on public.people;
create policy "People are accessible by owner" on public.people for all using (auth.uid() = user_id);

-- Loans Policies
drop policy if exists "Loans are accessible by owner" on public.loans;
create policy "Loans are accessible by owner" on public.loans for all using (auth.uid() = user_id);

-- Budgets Policies
drop policy if exists "Budgets are accessible by owner" on public.category_budgets;
create policy "Budgets are accessible by owner" on public.category_budgets for all using (auth.uid() = user_id);

-- Recurring Expenses Policies
drop policy if exists "Recurring are accessible by owner" on public.recurring_expenses;
create policy "Recurring are accessible by owner" on public.recurring_expenses for all using (auth.uid() = user_id);

-- Planned Expenses Policies
drop policy if exists "Planned are accessible by owner" on public.planned_expenses;
create policy "Planned are accessible by owner" on public.planned_expenses for all using (auth.uid() = user_id);
