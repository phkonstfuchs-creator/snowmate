-- An accepted response requires its responder. SET NULL ran before the hosted
-- ride/carpool cascade and violated that invariant during account deletion.
-- Deleting the response with its responder preserves both the invariant and
-- the existing host/resource/member deletion boundaries.
alter table public.ride_join_requests
  drop constraint ride_join_requests_responded_by_fkey,
  add constraint ride_join_requests_responded_by_fkey
    foreign key(responded_by) references public.profiles(id) on delete cascade;
alter table public.carpool_requests
  drop constraint carpool_requests_responded_by_fkey,
  add constraint carpool_requests_responded_by_fkey
    foreign key(responded_by) references public.profiles(id) on delete cascade;
