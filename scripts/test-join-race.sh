#!/usr/bin/env bash
# Race test: many riders try to take the last spots of one ride at the
# same moment, each in its own database session. join_ride() locks the
# ride row, so exactly total_spots riders may get in, never more.
#
#   PGURL=postgresql://postgres:postgres@127.0.0.1:54322/postgres scripts/test-join-race.sh
#
# Needs a database with the migrations applied. It commits its own test
# rows (pgTAP rolls back, so it cannot test concurrency) and removes them
# at the end.
set -euo pipefail

PGURL="${PGURL:?set PGURL}"
RIDERS="${RIDERS:-12}"
SPOTS=3
HOST="ad000000-0000-4000-8000-000000000000"
RIDE="ad000000-0000-4000-8000-0000000000ff"

cleanup() {
  psql "$PGURL" -q -v ON_ERROR_STOP=1 -c "delete from auth.users where id::text like 'ad000000-%'" > /dev/null
}
trap cleanup EXIT
cleanup

rider_id() { printf 'ad000000-0000-4000-8000-%012d' "$1"; }

{
  echo "begin;"
  echo "insert into auth.users (id, email) values ('$HOST', 'race-host@example.com');"
  for i in $(seq 1 "$RIDERS"); do
    echo "insert into auth.users (id, email) values ('$(rider_id "$i")', 'race-$i@example.com');"
  done
  echo "update public.profiles set display_name = 'Race ' || right(id::text, 3), handle = 'race_' || right(id::text, 3),
          city = 'innsbruck', ability_level = 'chill', is_minor = false where id::text like 'ad000000-%';"
  for i in $(seq 1 "$RIDERS"); do
    echo "insert into public.friendships (requester_id, addressee_id, status) values ('$HOST', '$(rider_id "$i")', 'accepted');"
  done
  echo "insert into public.rides (id, host_id, resort, city, ability_level, ride_date, meet_time, meet_point, total_spots)
        values ('$RIDE', '$HOST', 'Axamer Lizum', 'innsbruck', 'chill', current_date + 1, '09:00', 'Base station', $SPOTS);"
  echo "commit;"
} | psql "$PGURL" -q -v ON_ERROR_STOP=1 > /dev/null

results="$(mktemp)"
for i in $(seq 1 "$RIDERS"); do
  psql "$PGURL" -q -t -A -v ON_ERROR_STOP=1 >> "$results" <<SQL &
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"$(rider_id "$i")","role":"authenticated"}', false);
select set_config('request.jwt.claim.sub', '$(rider_id "$i")', false);
select 'result:' || public.join_ride('$RIDE');
SQL
done
wait

joined="$(grep -c '^result:joined$' "$results" || true)"
full="$(grep -c '^result:full$' "$results" || true)"
stored="$(psql "$PGURL" -t -A -c "select count(*) from public.ride_participants where ride_id = '$RIDE' and status = 'accepted'")"
rm -f "$results"

echo "race     $RIDERS riders, $SPOTS spots: $joined joined, $full told full, $stored stored"
if [[ "$joined" != "$SPOTS" || "$stored" != "$SPOTS" || "$((joined + full))" != "$RIDERS" ]]; then
  echo "not ok - simultaneous joins overbooked or lost answers" >&2
  exit 1
fi
echo "ok - simultaneous joins never overbook a ride"
