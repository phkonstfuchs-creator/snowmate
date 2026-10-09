begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

select ok(
  exists (select 1 from pg_extension where extname = 'pg_cron'),
  'pg_cron is installed by the migration set'
);

select results_eq(
  $$
    select count(*)
    from cron.job
    where jobname like 'snowmate-%-retention'
  $$,
  array[5::bigint],
  'all five database retention jobs are present'
);

select results_eq(
  $$
    select schedule, command
    from cron.job
    where jobname = 'snowmate-location-retention'
  $$,
  $$values (
    '* * * * *'::text,
    'select private.cleanup_expired_location_data(statement_timestamp())'::text
  )$$,
  'exact location data is physically cleaned every minute'
);

select results_eq(
  $$
    select schedule, command
    from cron.job
    where jobname = 'snowmate-export-retention'
  $$,
  $$values (
    '0 * * * *'::text,
    'select private.cleanup_data_exports(statement_timestamp())'::text
  )$$,
  'expired export snapshots are cleaned hourly'
);

select results_eq(
  $$
    select schedule, command
    from cron.job
    where jobname = 'snowmate-coordination-retention'
  $$,
  $$values (
    '7 2 * * *'::text,
    'select private.cleanup_expired_coordination_data(statement_timestamp())'::text
  )$$,
  'coordination metadata is cleaned daily'
);

select results_eq(
  $$
    select schedule, command
    from cron.job
    where jobname = 'snowmate-chat-retention'
  $$,
  $$values (
    '17 2 * * *'::text,
    'select private.cleanup_chat_and_moderation_data(statement_timestamp())'::text
  )$$,
  'chat and moderation content is cleaned daily'
);

select results_eq(
  $$
    select schedule, command
    from cron.job
    where jobname = 'snowmate-deletion-audit-retention'
  $$,
  $$values (
    '27 2 * * *'::text,
    'select private.cleanup_account_deletion_jobs(statement_timestamp())'::text
  )$$,
  'completed deletion audit jobs are cleaned daily'
);

select ok(
  (select bool_and(active) from cron.job where jobname like 'snowmate-%-retention'),
  'every retention job is active after migration'
);

select ok(
  not has_schema_privilege('authenticated', 'cron', 'USAGE'),
  'authenticated clients cannot inspect or alter scheduler state'
);

select * from finish();

rollback;
