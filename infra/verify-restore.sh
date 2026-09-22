#!/usr/bin/env bash
# Proves the backup can actually be restored, rather than assuming it.
#
# A backup nobody has restored is a hope, not a backup. This loads the newest dump into a
# scratch database, compares the row counts table by table, and throws the scratch away.
# Run it on the server, any time; it touches nothing live.
set -uo pipefail

PU=$(grep -oE '^DATABASE_URL=.*' /opt/rccg-mail/.env | cut -d= -f2- | sed -E 's|^postgres(ql)?://([^:]+):.*|\2|')
psql(){ docker exec -i rccg-mail-postgres-1 psql -U "$PU" -d "$1" -tAc "$2"; }
TABLES="people departments requisitions expense_items attachments comments activity requisition_stages reconciliations sessions"

DUMP=$(ls -t /opt/backups/postgres/requ_*.sql.gz 2>/dev/null | head -1)
[ -z "$DUMP" ] && { echo "No requisition backup found in /opt/backups/postgres."; exit 1; }
echo "Restoring $(basename "$DUMP") ($(du -h "$DUMP" | cut -f1)) into a scratch database"

psql postgres "drop database if exists requ_restore" >/dev/null 2>&1
psql postgres "create database requ_restore" >/dev/null
gunzip -c "$DUMP" | docker exec -i rccg-mail-postgres-1 psql -U "$PU" -d requ_restore -q >/dev/null 2>&1

bad=0
for t in $TABLES; do
  live=$(psql requ "select count(*) from $t" 2>/dev/null || echo "?")
  back=$(psql requ_restore "select count(*) from $t" 2>/dev/null || echo "MISSING")
  if [ "$live" = "$back" ]; then printf "  %-20s %-8s ok\n" "$t" "$back"
  else printf "  %-20s %-8s DIFFERS (live has %s)\n" "$t" "$back" "$live"; bad=1; fi
done

# The receipts are files, not rows, and are backed up separately.
ARCH=$(ls -t /opt/backups/config/requ-attachments_*.tar.gz 2>/dev/null | head -1)
if [ -n "$ARCH" ]; then
  # grep -c prints 0 AND exits non-zero when nothing matches, so || would append a second
  # count. Count with wc instead.
  archived=$(tar tzf "$ARCH" 2>/dev/null | grep -v '/$' | wc -l | tr -d ' ')
  ondisk=$(find /opt/requ/attachments -type f 2>/dev/null | wc -l | tr -d ' ')
  if [ "$archived" = "$ondisk" ]; then printf "  %-20s %-8s ok\n" "receipts (files)" "$archived"
  else printf "  %-20s %-8s DIFFERS (%s on disk)\n" "receipts (files)" "$archived" "$ondisk"; bad=1; fi
fi

psql postgres "drop database if exists requ_restore" >/dev/null 2>&1
[ $bad -eq 0 ] && echo "Restore verified." || echo "Restore did NOT match. Investigate before relying on it."
exit $bad
