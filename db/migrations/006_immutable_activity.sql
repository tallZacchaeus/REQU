-- Make the activity trail append-only in the database, not merely by convention.
--
-- Until now nothing wrote an UPDATE or DELETE against it, which is a promise the code keeps
-- and any future change could quietly break. When the end of a process is a payment, the
-- record of who did what has to be the one thing nobody can tidy up afterwards — including
-- somebody with a psql prompt and good intentions.
create or replace function activity_is_append_only() returns trigger as $$
begin
  raise exception 'activity is append-only: % is not permitted', tg_op
    using hint = 'Record what happened next; never edit what happened before.';
end;
$$ language plpgsql;

drop trigger if exists activity_no_update on activity;
drop trigger if exists activity_no_delete on activity;

create trigger activity_no_update before update on activity
  for each row execute function activity_is_append_only();

-- Deleting a requisition still removes its trail, because the row references it and there is
-- no orphan to keep. Nothing in the application deletes a requisition; cancelling is a status.
create trigger activity_no_delete before delete on activity
  for each row when (pg_trigger_depth() = 0) execute function activity_is_append_only();
