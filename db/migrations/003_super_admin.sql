-- A platform administrator: the person who runs REQU, as distinct from anyone who takes
-- part in the workflow.
--
-- Deliberately NOT a role that can approve or disburse. The whole value of this system is
-- that an approval is attributable to the officer who holds that post; a technical account
-- able to approve would reintroduce exactly the hole the workflow exists to close. What it
-- can do is see everything and administer accounts.
alter table people drop constraint if exists people_role_check;
alter table people add constraint people_role_check
  check (role in ('hod','ayp','nyp','finance','super_admin'));
