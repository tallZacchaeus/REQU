-- Sign-in: single-use emailed links, sessions, and the limits that stop both being abused.
--
-- All three live in Postgres rather than Redis. The mail application next door uses Redis
-- for sessions, but it is on another Docker network and REQU is one small app on one box:
-- a second service to plumb, watch and back up buys nothing here, and one database means
-- one backup covers everything.

-- Only the hash is stored. A copy of this table lets nobody sign in as anybody, which is
-- the whole point of a link you can only use once.
create table if not exists login_tokens (
  token_hash   text primary key,
  person_id    int not null references people(id) on delete cascade,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  -- Set the moment it is redeemed. The row is kept rather than deleted so a second
  -- attempt can be told apart from a link that never existed.
  used_at      timestamptz,
  requested_ip text
);
create index if not exists login_tokens_person_idx on login_tokens(person_id);
create index if not exists login_tokens_expiry_idx on login_tokens(expires_at);

create table if not exists sessions (
  id            text primary key,
  person_id     int not null references people(id) on delete cascade,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  expires_at    timestamptz not null,
  user_agent    text,
  ip            text
);
create index if not exists sessions_person_idx on sessions(person_id);
create index if not exists sessions_expiry_idx on sessions(expires_at);

-- A counter per key per window. Crude, but this is tens of people, and a limit that
-- survives a restart is worth more here than a fast one.
create table if not exists rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (key, window_start)
);
create index if not exists rate_limits_window_idx on rate_limits(window_start);
