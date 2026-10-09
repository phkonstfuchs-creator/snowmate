-- A block revokes current membership; retain its effect on historical chat.
-- Otherwise deleting a blocked participant makes the host's access check pass.
create or replace function private.can_access_conversation(
  p_user_id uuid,
  p_conversation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id is not null
    and private.can_account_use_core(p_user_id)
    and exists (
      select 1
      from public.conversations as conversation
      join public.conversation_members as own_membership
        on own_membership.conversation_id = conversation.id
       and own_membership.user_id = p_user_id
      where conversation.id = p_conversation_id
        and (
          (
            conversation.kind = 'dm'
            and exists (
              select 1
              from private.dm_conversation_pairs as pair
              where pair.conversation_id = conversation.id
                and p_user_id in (pair.user_low, pair.user_high)
                and private.are_friends(
                  p_user_id,
                  case
                    when pair.user_low = p_user_id then pair.user_high
                    else pair.user_low
                  end
                )
            )
          )
          or (
            conversation.kind = 'ride'
            and private.is_ride_member(conversation.ride_id, p_user_id)
            and not exists (
              select 1
              from private.ride_participation_history as other_member
              where other_member.ride_id = conversation.ride_id
                and other_member.user_id <> p_user_id
                and private.is_blocked_between(
                  p_user_id,
                  other_member.user_id
                )
            )
          )
        )
    );
$$;

-- Use the same clock as the response deadline assigned by report commands.
-- Transaction-start defaults can backdate creation during long transactions.
alter table public.reports alter column created_at set default statement_timestamp();
alter table public.report_appeals alter column created_at set default statement_timestamp();
