create extension if not exists pg_cron;

revoke all on schema cron from public, anon, authenticated, service_role;
revoke all on all tables in schema cron
  from public, anon, authenticated, service_role;
revoke all on all sequences in schema cron
  from public, anon, authenticated, service_role;
revoke all on all functions in schema cron
  from public, anon, authenticated, service_role;

select cron.schedule(
  'snowmate-location-retention',
  '* * * * *',
  'select private.cleanup_expired_location_data(statement_timestamp())'
);

select cron.schedule(
  'snowmate-export-retention',
  '0 * * * *',
  'select private.cleanup_data_exports(statement_timestamp())'
);

select cron.schedule(
  'snowmate-coordination-retention',
  '7 2 * * *',
  'select private.cleanup_expired_coordination_data(statement_timestamp())'
);

select cron.schedule(
  'snowmate-chat-retention',
  '17 2 * * *',
  'select private.cleanup_chat_and_moderation_data(statement_timestamp())'
);

select cron.schedule(
  'snowmate-deletion-audit-retention',
  '27 2 * * *',
  'select private.cleanup_account_deletion_jobs(statement_timestamp())'
);
