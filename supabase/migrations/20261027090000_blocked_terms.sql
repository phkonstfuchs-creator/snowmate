-- Basic word filter for user-generated text (App Store guideline 1.2,
-- ADR 0031). It complements report and block (ADR 0010); it does not
-- replace moderation. Only severe slurs, hate slogans and calls to
-- self-harm are listed, so normal ski talk never trips it.
--
-- Enforced in the database, so every write path (server actions, RPCs,
-- direct table writes) is covered. A hit raises SQLSTATE PB001, which the
-- app maps to a friendly "please rephrase" message.

create table private.blocked_terms (
  term text primary key check (term = lower(term) and char_length(term) between 2 and 40),
  -- true: only as a separate word ("spast"), false: also inside words ("hurensohn" in "duhurensohn")
  whole_word boolean not null default true
);

alter table private.blocked_terms enable row level security;
alter table private.blocked_terms force row level security;
revoke all on private.blocked_terms from public, anon, authenticated;

insert into private.blocked_terms (term, whole_word) values
  -- English slurs
  ('nigger', false), ('nigga', false), ('faggot', false), ('fag', true),
  ('kike', true), ('chink', true), ('spic', true), ('tranny', true), ('retard', true),
  -- German slurs and insults aimed at groups
  ('neger', true), ('kanake', false), ('kanacke', false), ('schwuchtel', false),
  ('judensau', false), ('untermensch', false), ('zigeuner', true),
  ('missgeburt', false), ('fotze', false), ('hurensohn', false), ('spast', true), ('mongo', true),
  -- Hate slogans
  ('heil hitler', false), ('sieg heil', false),
  -- Calls to self-harm
  ('kill yourself', false), ('kys', true), ('bring dich um', false), ('häng dich auf', false);

-- Lower-case, undo common look-alike swaps and collapse spaces, so
-- "N1GG3R" and "heil   hitler" are caught too.
create or replace function private.normalize_for_filter(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(translate(lower(input), '013457@$!', 'oieastasi'), '\s+', ' ', 'g');
$$;

create or replace function private.has_blocked_term(input text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select input is not null and exists (
    select 1
    from private.blocked_terms b
    where case
      when b.whole_word then
        private.normalize_for_filter(input) ~ ('(^|[^a-zäöüß])' || b.term || '($|[^a-zäöüß])')
      else
        strpos(private.normalize_for_filter(input), b.term) > 0
    end
  );
$$;

revoke all on function private.normalize_for_filter(text) from public, anon, authenticated;
revoke all on function private.has_blocked_term(text) from public, anon, authenticated;

-- One trigger function for every table; the columns to check are the
-- trigger arguments.
create or replace function private.refuse_blocked_terms()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  column_name text;
  row_data jsonb := to_jsonb(new);
begin
  foreach column_name in array tg_argv loop
    if private.has_blocked_term(row_data ->> column_name) then
      raise exception 'text contains a blocked term' using errcode = 'PB001';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function private.refuse_blocked_terms() from public, anon, authenticated;

create trigger posts_blocked_terms
  before insert or update of body on public.posts
  for each row execute function private.refuse_blocked_terms('body');

create trigger messages_blocked_terms
  before insert or update of body on public.messages
  for each row execute function private.refuse_blocked_terms('body');

create trigger profiles_blocked_terms
  before insert or update of display_name, handle, bio on public.profiles
  for each row execute function private.refuse_blocked_terms('display_name', 'handle', 'bio');

create trigger rides_blocked_terms
  before insert or update of title, meet_point, caption on public.rides
  for each row execute function private.refuse_blocked_terms('title', 'meet_point', 'caption');

create trigger carpools_blocked_terms
  before insert or update of departure_point, note on public.carpools
  for each row execute function private.refuse_blocked_terms('departure_point', 'note');
