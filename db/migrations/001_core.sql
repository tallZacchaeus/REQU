-- REQU core schema.
--
-- Mirrors lib/types.ts deliberately: the prototype's model was well judged and the
-- screens are already written against it, so the database follows it rather than
-- inventing a second vocabulary for the same things.
--
-- Money is WHOLE NAIRA in a bigint, matching the domain ("kobo-free whole naira" in
-- types.ts). Storing minor units would be the usual habit, but nothing in this workflow
-- deals in kobo, and a units mismatch across 29 screens is a likelier bug than the
-- precision is a need.

create table if not exists departments (
  id          serial primary key,
  name        text not null unique,
  sort_order  int  not null default 100
);

-- Roles are the four sides of the workflow. Kept as text with a check rather than an
-- enum type: adding a role later is then a one-line migration, not a type rewrite.
create table if not exists people (
  id            serial primary key,
  email         text not null unique,
  full_name     text not null,
  short_name    text,
  initials      text,
  role          text not null check (role in ('hod','ayp','nyp','finance')),
  title         text,
  scope         text,
  phone         text,
  department_id int references departments(id),
  -- Someone who has left keeps their history but can no longer sign in.
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists people_role_idx on people(role) where active;

create table if not exists requisitions (
  id             uuid primary key default gen_random_uuid(),
  reference      text not null unique,
  programme      text not null,
  programme_date date,
  location       text,
  purpose        text,
  department_id  int  not null references departments(id),
  requester_id   int  not null references people(id),
  status         text not null default 'draft' check (status in (
                   'draft','under_review','recommended','awaiting_approval','approved',
                   'with_finance','disbursed','changes_requested','rejected',
                   'reconciliation_review','reconciled')),
  -- Bank or transfer reference, recorded by Finance on payment.
  payment_ref    text,
  submitted_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists requisitions_status_idx on requisitions(status);
create index if not exists requisitions_requester_idx on requisitions(requester_id);
create index if not exists requisitions_department_idx on requisitions(department_id);

create table if not exists expense_items (
  id              uuid primary key default gen_random_uuid(),
  requisition_id  uuid not null references requisitions(id) on delete cascade,
  description     text not null,
  amount          bigint not null default 0 check (amount >= 0),   -- whole naira
  sort_order      int not null default 0
);
create index if not exists expense_items_req_idx on expense_items(requisition_id);

create table if not exists attachments (
  id              uuid primary key default gen_random_uuid(),
  requisition_id  uuid not null references requisitions(id) on delete cascade,
  name            text not null,
  kind            text not null check (kind in ('proposal','quotation','receipt','other')),
  byte_size       bigint not null default 0,
  content_type    text,
  -- Where the bytes live. Null until phase 4 puts real uploads behind this.
  storage_key     text,
  uploaded_by     int references people(id),
  created_at      timestamptz not null default now()
);
create index if not exists attachments_req_idx on attachments(requisition_id);

create table if not exists comments (
  id                uuid primary key default gen_random_uuid(),
  requisition_id    uuid not null references requisitions(id) on delete cascade,
  author_id         int  not null references people(id),
  body              text not null,
  -- Set when the comment is the reason a requisition was sent back.
  requested_changes text[] not null default '{}',
  created_at        timestamptz not null default now()
);
create index if not exists comments_req_idx on comments(requisition_id, created_at);

-- Append-only. No update or delete path is ever written against this table: when the
-- end of a process is a payment, the record of who did what has to be the one thing
-- nobody can quietly tidy up afterwards.
create table if not exists activity (
  id              bigserial primary key,
  requisition_id  uuid not null references requisitions(id) on delete cascade,
  actor_id        int references people(id),
  action          text not null,
  detail          jsonb,
  at              timestamptz not null default now()
);
create index if not exists activity_req_idx on activity(requisition_id, at);

-- One row per stage a requisition has actually completed. Absent means not done, which
-- is exactly how the prototype's stageDates behaves.
create table if not exists requisition_stages (
  requisition_id uuid not null references requisitions(id) on delete cascade,
  stage          text not null check (stage in ('submitted','recommended','approval','disbursement','reconciled')),
  completed_at   timestamptz not null default now(),
  note           text,
  primary key (requisition_id, stage)
);

create table if not exists reconciliations (
  requisition_id uuid primary key references requisitions(id) on delete cascade,
  note           text,
  submitted_at   timestamptz not null default now()
);

-- Actual spend per line. Separate from expense_items so the request and the outturn
-- are never confused with one another.
create table if not exists reconciliation_actuals (
  requisition_id  uuid not null references requisitions(id) on delete cascade,
  expense_item_id uuid not null references expense_items(id) on delete cascade,
  amount          bigint not null default 0 check (amount >= 0),   -- whole naira
  primary key (requisition_id, expense_item_id)
);
