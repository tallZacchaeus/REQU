-- Real files. The rows existed from the start; nothing ever wrote a byte to them.
alter table attachments add column if not exists scanned_at   timestamptz;
alter table attachments add column if not exists scan_result  text;
alter table attachments add column if not exists sha256       text;

-- A file is only retrievable once it has been through whatever checking is configured.
-- Anything still null here has been accepted but not yet cleared, and is not served.
create index if not exists attachments_unscanned_idx on attachments(requisition_id) where scanned_at is null;
