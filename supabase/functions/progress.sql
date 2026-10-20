-- Функции для Edge Function progress

create or replace function public.ef_load_progress(p_telegram_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  st jsonb;
  ca bigint;
begin
  select state, save_created_at into st, ca
  from game.players
  where telegram_id = p_telegram_id;
  if st is null then return null; end if;
  return jsonb_build_object('state', st, 'save_created_at', coalesce(ca, 0));
end;
$$;

create or replace function public.ef_save_progress(
  p_telegram_id bigint,
  p_state jsonb,
  p_company_no integer,
  p_lifetime double precision,
  p_score double precision,
  p_save_created_at bigint,
  p_force boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if p_state is null or octet_length(p_state::text) > 1000000 then
    raise exception 'bad state';
  end if;
  if p_company_no is null or p_company_no < 1 or p_company_no > 1000 or
     p_lifetime is null or p_lifetime < 0 or p_lifetime = 'Infinity'::float8 or p_lifetime = 'NaN'::float8 then
    raise exception 'bad numbers';
  end if;

  insert into game.players (telegram_id, company_no, lifetime, score, state, save_created_at, updated_at)
  values (p_telegram_id, p_company_no, p_lifetime, p_score, p_state, p_save_created_at, now())
  on conflict (telegram_id) do update
     set company_no = excluded.company_no,
         lifetime = excluded.lifetime,
         score = excluded.score,
         state = excluded.state,
         save_created_at = excluded.save_created_at,
         updated_at = now()
    where p_force or excluded.score >= game.players.score - 1e-6;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

create or replace function public.ef_leaderboard(p_limit integer, p_telegram_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  top jsonb;
  me jsonb;
  lim integer := least(greatest(coalesce(p_limit, 100), 1), 200);
begin
  with ranked as (
    select telegram_id,
           trim(first_name || ' ' || last_name) as name,
           company_no, lifetime,
           row_number() over (order by company_no desc, lifetime desc, created_at) as place
      from game.players
     where state is not null
  )
  select
    (select coalesce(jsonb_agg(jsonb_build_object('place', place, 'name', name, 'company', company_no, 'lifetime', lifetime, 'me', telegram_id = p_telegram_id) order by place), '[]'::jsonb)
       from ranked where place <= lim),
    (select jsonb_build_object('place', place, 'name', name, 'company', company_no, 'lifetime', lifetime, 'me', true)
       from ranked where telegram_id = p_telegram_id)
  into top, me;
  return jsonb_build_object('top', top, 'me', me);
end;
$$;

grant execute on function public.ef_load_progress(bigint) to anon, authenticated;
grant execute on function public.ef_save_progress(bigint, jsonb, integer, double precision, double precision, bigint, boolean) to anon, authenticated;
grant execute on function public.ef_leaderboard(integer, bigint) to anon, authenticated;
