-- People register themselves; an administrator then says who they are.
--
-- A new account lands on 'pending', which can see nothing and do nothing. That is the point:
-- registering proves only that somebody controls a church mailbox, which is not the same as
-- being a Head of Department, and certainly not the same as being Finance.
alter table people drop constraint if exists people_role_check;
alter table people add constraint people_role_check
  check (role in ('pending','hod','ayp','nyp','finance','super_admin'));

alter table people alter column role set default 'pending';

-- Who let them in, and when. An account that gained the power to approve money should carry
-- the record of who granted it.
alter table people add column if not exists approved_by  int references people(id);
alter table people add column if not exists approved_at  timestamptz;
alter table people add column if not exists registered_at timestamptz not null default now();
