#!/usr/bin/env bash
# Runs the migrations and pgTAP tests against a plain local Postgres
# (with the pgtap extension installed), without Docker or the Supabase CLI.
#
#   PGURL=postgresql://postgres@localhost:5432/postgres scripts/test-db-local.sh
#
# The database named by DB (default snowmate_test) is dropped and
# recreated on every run.
set -euo pipefail

cd "$(dirname "$0")/.."

PGURL="${PGURL:-postgresql://postgres@localhost:5432/postgres}"
DB="${DB:-snowmate_test}"
TEST_URL="${PGURL%/*}/$DB"

psql "$PGURL" -q -v ON_ERROR_STOP=1 -c "drop database if exists $DB" -c "create database $DB"
psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -v dbname="$DB" -f scripts/db-test-shim.sql

for migration in supabase/migrations/*.sql; do
  echo "migrate  $migration"
  psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$migration" > /dev/null
done

failed=0
for test in supabase/tests/database/*.sql; do
  output="$(psql "$TEST_URL" -q -t -A -f "$test" 2>&1)"
  passed="$(grep -c '^ok' <<< "$output" || true)"
  plan="$(grep -m1 '^1\.\.' <<< "$output" || true)"
  problems="$(grep -E '^not ok|ERROR|Looks like' <<< "$output" || true)"

  echo "test     $test  ($passed passed, plan $plan)"
  if [[ -n "$problems" || -z "$plan" || "1..$passed" != "$plan" ]]; then
    echo "$problems"
    failed=1
  fi
done

exit "$failed"
