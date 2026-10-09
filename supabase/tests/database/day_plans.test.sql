begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

select has_table('private', 'day_plans', 'private day plans are stored outside public tables');
select has_function('public', 'save_day_plan', array['uuid', 'integer', 'jsonb'], 'the owner-only save RPC exists');
select has_function('public', 'delete_day_plan', array['uuid', 'integer'], 'the owner-only delete RPC exists');
select has_function('public', 'list_my_day_plans', array[]::text[], 'the owner-only list RPC exists');
select has_function('private', 'cleanup_day_plans', array['timestamp with time zone'], 'private expiration cleanup exists');
select ok(not has_table_privilege('authenticated', 'private.day_plans', 'SELECT'), 'authenticated users cannot read the private table directly');
select ok(not has_table_privilege('authenticated', 'private.day_plans', 'INSERT'), 'authenticated users cannot write the private table directly');
select ok(not has_function_privilege('authenticated', 'private.cleanup_day_plans(timestamptz)', 'EXECUTE'), 'clients cannot run global cleanup');

select * from finish();
rollback;
