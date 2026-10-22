-- IT-Office: серверные функции для Edge Function `progress`, версия 2.
-- Что меняется:
--   * сохранение снова доходит до базы: прошлая Edge Function передавала параметры, которых у функции не было;
--   * процент компании и реорганизации хранятся и отдаются в рейтинг;
--   * имя и фамилия не затираются пустыми;
--   * мягкая проверка подписи Telegram: результат записывается (auth_kind), но запись пока НЕ блокируется,
--     кроме явной подделки (подпись верная, но от другого игрока). Строгий режим включим, когда по auth_kind
--     будет видно, что подпись приходит на всех устройствах.
-- Функции лежат в public, но вызвать их может только роль service_role (Edge Function), не браузер.
-- Данные игроков не меняются, только добавляются столбцы.
-- Запуск: Supabase → SQL Editor → вставить файл целиком → Run. Можно запускать повторно.

create extension if not exists pgcrypto with schema extensions;

alter table game.players
  add column if not exists company_progress integer not null default 0,
  add column if not exists company_reorgs integer not null default 0,
  add column if not exists auth_kind text,
  add column if not exists auth_platform text,
  add column if not exists auth_at timestamptz;

-- ---------- проверка подписи Telegram (те же функции, что в 20261019180000) ----------

create or replace function game.url_decode(s text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    convert_from(
      string_agg(
        case when m.a[1] ~ '^%[0-9a-fA-F]{2}$' then decode(substr(m.a[1], 2), 'hex')
             else convert_to(m.a[1], 'UTF8') end,
        ''::bytea order by m.o),
      'UTF8'),
    '')
  from regexp_matches(replace(coalesce(s, ''), '+', ' '), '(%[0-9a-fA-F]{2}|[^%]+|%)', 'g') with ordinality as m(a, o);
$$;

create or replace function game.verify_init_data(init_data text)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  bot_token text;
  pairs jsonb := '{}'::jsonb;
  part text;
  k text;
  v text;
  their_hash text;
  check_string text;
  secret bytea;
  auth_date bigint;
begin
  select value into bot_token from game.config where key = 'bot_token';
  if bot_token is null or bot_token = '' then
    raise exception 'bot_token is not configured';
  end if;
  if init_data is null or length(init_data) = 0 or length(init_data) > 8192 then
    raise exception 'bad init data';
  end if;

  foreach part in array string_to_array(init_data, '&') loop
    if position('=' in part) = 0 then continue; end if;
    k := game.url_decode(split_part(part, '=', 1));
    v := game.url_decode(substr(part, position('=' in part) + 1));
    pairs := pairs || jsonb_build_object(k, v);
  end loop;

  their_hash := pairs ->> 'hash';
  if their_hash is null then raise exception 'bad init data'; end if;

  select string_agg(e.key || '=' || e.value, E'\n' order by e.key)
    into check_string
    from jsonb_each_text(pairs - 'hash') e;

  secret := extensions.hmac(convert_to(bot_token, 'UTF8'), convert_to('WebAppData', 'UTF8'), 'sha256');
  if encode(extensions.hmac(convert_to(check_string, 'UTF8'), secret, 'sha256'), 'hex') <> lower(their_hash) then
    raise exception 'bad signature';
  end if;

  auth_date := (pairs ->> 'auth_date')::bigint;
  if auth_date is null or auth_date < extract(epoch from now())::bigint - 7 * 86400 then
    raise exception 'init data expired';
  end if;

  return (pairs ->> 'user')::jsonb;
end;
$$;

-- Итог проверки: verified / missing (подписи нет) / bad / expired / no_token / mismatch (подпись другого игрока).
create or replace function game.check_init(p_init_data text, p_telegram_id bigint, out kind text, out tg_user jsonb)
language plpgsql
stable
set search_path = ''
as $$
begin
  tg_user := null;
  if p_init_data is null or p_init_data = '' or position('hash=' in p_init_data) = 0 then
    kind := 'missing';
    return;
  end if;
  begin
    tg_user := game.verify_init_data(p_init_data);
    if (tg_user ->> 'id')::bigint is distinct from p_telegram_id then
      kind := 'mismatch';
    else
      kind := 'verified';
    end if;
  exception when others then
    tg_user := null;
    kind := case
      when sqlerrm like '%expired%' then 'expired'
      when sqlerrm like '%bot_token%' then 'no_token'
      else 'bad'
    end;
  end;
end;
$$;

create or replace function game.note_auth(p_telegram_id bigint, p_kind text, p_platform text)
returns void
language sql
set search_path = ''
as $$
  update game.players
     set auth_kind = p_kind, auth_platform = left(p_platform, 32), auth_at = now()
   where telegram_id = p_telegram_id;
$$;

-- ---------- функции для Edge Function ----------

create or replace function public.srv_load_progress(p_telegram_id bigint, p_init_data text, p_platform text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  st jsonb;
  ca bigint;
begin
  if p_telegram_id is null or p_telegram_id <= 0 then return null; end if;
  c := game.check_init(p_init_data, p_telegram_id);
  if c.kind = 'mismatch' then return jsonb_build_object('state', null, 'save_created_at', 0, 'auth', c.kind); end if;
  perform game.note_auth(p_telegram_id, c.kind, p_platform);
  select state, save_created_at into st, ca from game.players where telegram_id = p_telegram_id;
  return jsonb_build_object('state', st, 'save_created_at', coalesce(ca, 0), 'auth', c.kind);
end;
$$;

create or replace function public.srv_save_progress(
  p_telegram_id bigint,
  p_init_data text,
  p_platform text,
  p_first_name text,
  p_last_name text,
  p_username text,
  p_state jsonb,
  p_company_no integer,
  p_company_progress integer,
  p_company_reorgs integer,
  p_lifetime double precision,
  p_score double precision,
  p_save_created_at bigint,
  p_force boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  fn text;
  ln text;
  un text;
  n integer;
begin
  if p_telegram_id is null or p_telegram_id <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'no_id');
  end if;
  if p_state is null or octet_length(p_state::text) > 1000000 then
    return jsonb_build_object('ok', false, 'reason', 'bad_state');
  end if;
  if p_company_no is null or p_company_no < 1 or p_company_no > 1000
     or p_lifetime is null or p_lifetime < 0 or p_lifetime = 'Infinity'::float8 or p_lifetime = 'NaN'::float8
     or p_score is null or p_score = 'NaN'::float8 then
    return jsonb_build_object('ok', false, 'reason', 'bad_numbers');
  end if;

  c := game.check_init(p_init_data, p_telegram_id);
  if c.kind = 'mismatch' then
    return jsonb_build_object('ok', false, 'reason', 'mismatch', 'auth', c.kind);
  end if;

  -- имя: из подписанных данных Telegram, иначе — что прислал клиент
  if c.kind = 'verified' then
    fn := coalesce(c.tg_user ->> 'first_name', '');
    ln := coalesce(c.tg_user ->> 'last_name', '');
    un := c.tg_user ->> 'username';
  else
    fn := left(coalesce(p_first_name, ''), 64);
    ln := left(coalesce(p_last_name, ''), 64);
    un := left(p_username, 64);
  end if;

  insert into game.players as p (
    telegram_id, first_name, last_name, username,
    company_no, company_progress, company_reorgs,
    lifetime, score, state, save_created_at, updated_at,
    auth_kind, auth_platform, auth_at
  ) values (
    p_telegram_id, fn, ln, un,
    p_company_no, greatest(0, least(100, coalesce(p_company_progress, 0))), greatest(0, coalesce(p_company_reorgs, 0)),
    p_lifetime, p_score, p_state, coalesce(p_save_created_at, 0), now(),
    c.kind, left(p_platform, 32), now()
  )
  on conflict (telegram_id) do update
     set first_name = case when excluded.first_name <> '' then excluded.first_name else p.first_name end,
         last_name = case when excluded.first_name <> '' then excluded.last_name else p.last_name end,
         username = coalesce(excluded.username, p.username),
         company_no = excluded.company_no,
         company_progress = excluded.company_progress,
         company_reorgs = excluded.company_reorgs,
         lifetime = excluded.lifetime,
         score = excluded.score,
         state = excluded.state,
         save_created_at = excluded.save_created_at,
         updated_at = now(),
         auth_kind = excluded.auth_kind,
         auth_platform = excluded.auth_platform,
         auth_at = now()
   where p_force or excluded.score >= p.score - 1e-6;
  get diagnostics n = row_count;

  if n = 0 then
    perform game.note_auth(p_telegram_id, c.kind, p_platform);
    return jsonb_build_object('ok', false, 'reason', 'stale', 'auth', c.kind);
  end if;
  return jsonb_build_object('ok', true, 'auth', c.kind);
end;
$$;

-- Рейтинг: первые p_limit игроков и место самого игрока. Только имя, компания, процент, реорганизации, заработок.
create or replace function public.srv_leaderboard(p_limit integer, p_telegram_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  lim integer := least(greatest(coalesce(p_limit, 100), 1), 200);
  top jsonb;
  me jsonb;
begin
  with ranked as (
    select telegram_id,
           trim(first_name || ' ' || last_name) as name,
           company_no, company_progress, company_reorgs, lifetime,
           row_number() over (order by company_no desc, lifetime desc, created_at) as place
      from game.players
     where state is not null
  )
  select
    (select coalesce(jsonb_agg(jsonb_build_object(
        'place', place, 'name', name, 'company', company_no,
        'companyProgress', company_progress, 'companyReorgs', company_reorgs,
        'lifetime', lifetime, 'me', telegram_id = p_telegram_id) order by place), '[]'::jsonb)
       from ranked where place <= lim),
    (select jsonb_build_object(
        'place', place, 'name', name, 'company', company_no,
        'companyProgress', company_progress, 'companyReorgs', company_reorgs,
        'lifetime', lifetime, 'me', true)
       from ranked where telegram_id = p_telegram_id)
  into top, me;
  return jsonb_build_object('top', top, 'me', me);
end;
$$;

-- Сколько игроков с какой подписью и с каких устройств (без имён и id) — чтобы решить, когда включать строгий режим.
create or replace function public.srv_auth_stats()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('platform', coalesce(auth_platform, '?'), 'auth', coalesce(auth_kind, '?'), 'players', n, 'last', last)), '[]'::jsonb)
    from (
      select auth_platform, auth_kind, count(*) as n, max(auth_at) as last
        from game.players
       group by auth_platform, auth_kind
       order by 1, 2
    ) s;
$$;

-- ---------- права: только Edge Function (service_role) ----------

do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where (n.nspname = 'public' and p.proname in ('srv_load_progress', 'srv_save_progress', 'srv_leaderboard', 'srv_auth_stats'))
        or (n.nspname = 'game' and p.proname in ('check_init', 'note_auth', 'url_decode', 'verify_init_data'))
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    if f::text like 'srv_%' or f::text like 'public.srv_%' then
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;
end;
$$;
