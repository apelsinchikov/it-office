-- IT-Office: прогресс игроков и рейтинг.
-- Запуск: Supabase → SQL Editor → вставить файл целиком → Run. Скрипт можно запускать повторно.
--
-- Устройство:
--   * данные лежат в схеме game, которая НЕ открыта в Data API: напрямую из браузера к таблицам не добраться;
--   * браузер вызывает только три функции public.* (load_progress, save_progress, leaderboard) с publishable-ключом;
--   * каждая функция сама проверяет подпись Telegram initData (HMAC-SHA256) токеном бота,
--     поэтому записать можно только своё сохранение, а имя берётся из подписанных данных Telegram.
--   * токен бота хранится в game.config и наружу не отдаётся.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists game;
revoke all on schema game from public, anon, authenticated;

create table if not exists game.config (
  key text primary key,
  value text not null
);

create table if not exists game.players (
  telegram_id bigint primary key,
  first_name text not null default '',
  last_name text not null default '',
  username text,
  company_no integer not null default 1,
  lifetime double precision not null default 0,
  score double precision not null default 0,
  state jsonb,
  save_created_at bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists players_rating_idx on game.players (company_no desc, lifetime desc);

-- на всякий случай: даже если схему game когда-нибудь откроют в API, без политик строки не видны
alter table game.config enable row level security;
alter table game.players enable row level security;
revoke all on all tables in schema game from public, anon, authenticated;

-- ---------- проверка Telegram initData ----------

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

-- Возвращает поле user из initData (jsonb), если подпись верна и данные не старше 7 дней; иначе ошибка.
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

-- ---------- функции для игры ----------

-- Сохранение игрока (или null, если его ещё нет). Заодно обновляет имя из Telegram.
-- Возвращает jsonb: { state: ..., save_created_at: ... } или null, если игрока нет.
create or replace function public.load_progress(init_data text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u jsonb := game.verify_init_data(init_data);
  uid bigint := (u ->> 'id')::bigint;
  st jsonb;
  ca bigint;
begin
  update game.players
     set first_name = coalesce(u ->> 'first_name', ''),
         last_name = coalesce(u ->> 'last_name', ''),
         username = u ->> 'username'
    where telegram_id = uid
   returning state, save_created_at into st, ca;
  if st is null then
    return null;
  end if;
  return jsonb_build_object('state', st, 'save_created_at', coalesce(ca, 0));
end;
$$;

-- Записать сохранение. Более «отсталое», чем на сервере, не принимается (защита от старого телефона),
-- кроме force = true — сброс из настроек или по списку resets.json.
-- Возвращает true, если записано.
create or replace function public.save_progress(
  init_data text,
  state jsonb,
  company_no integer,
  lifetime double precision,
  score double precision,
  save_created_at bigint,
  force boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  u jsonb := game.verify_init_data(init_data);
  uid bigint := (u ->> 'id')::bigint;
  n integer;
begin
  if state is null or octet_length(state::text) > 1000000 then
    raise exception 'bad state';
  end if;
  if company_no is null or company_no < 1 or company_no > 1000 or lifetime is null or lifetime < 0 or lifetime = 'Infinity'::float8 or lifetime = 'NaN'::float8 then
    raise exception 'bad numbers';
  end if;

  insert into game.players as p (telegram_id, first_name, last_name, username, company_no, lifetime, score, state, save_created_at, updated_at)
  values (uid, coalesce(u ->> 'first_name', ''), coalesce(u ->> 'last_name', ''), u ->> 'username',
          save_progress.company_no, save_progress.lifetime, save_progress.score, save_progress.state, save_progress.save_created_at, now())
  on conflict (telegram_id) do update
     set first_name = excluded.first_name,
         last_name = excluded.last_name,
         username = excluded.username,
         company_no = excluded.company_no,
         lifetime = excluded.lifetime,
         score = excluded.score,
         state = excluded.state,
         save_created_at = excluded.save_created_at,
         updated_at = now()
   where force or excluded.score >= p.score - 1e-6;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

-- Рейтинг: первые p_limit игроков и место самого игрока.
-- Отдаются только имя, номер компании и общий заработок — без id и ников.
create or replace function public.leaderboard(init_data text, p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u jsonb := game.verify_init_data(init_data);
  uid bigint := (u ->> 'id')::bigint;
  lim integer := least(greatest(coalesce(p_limit, 100), 1), 200);
  top jsonb;
  me jsonb;
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
    (select coalesce(jsonb_agg(jsonb_build_object('place', place, 'name', name, 'company', company_no, 'lifetime', lifetime, 'me', telegram_id = uid) order by place), '[]'::jsonb)
       from ranked where place <= lim),
    (select jsonb_build_object('place', place, 'name', name, 'company', company_no, 'lifetime', lifetime, 'me', true)
       from ranked where telegram_id = uid)
  into top, me;
  return jsonb_build_object('top', top, 'me', me);
end;
$$;

-- ---------- права ----------

revoke all on function game.url_decode(text) from public, anon, authenticated;
revoke all on function game.verify_init_data(text) from public, anon, authenticated;

revoke all on function public.load_progress(text) from public;
revoke all on function public.save_progress(text, jsonb, integer, double precision, double precision, bigint, boolean) from public;
revoke all on function public.leaderboard(text, integer) from public;

grant execute on function public.load_progress(text) to anon, authenticated;
grant execute on function public.save_progress(text, jsonb, integer, double precision, double precision, bigint, boolean) to anon, authenticated;
grant execute on function public.leaderboard(text, integer) to anon, authenticated;
