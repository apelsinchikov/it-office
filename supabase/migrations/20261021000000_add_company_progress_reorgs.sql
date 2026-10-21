-- IT-Office: добавить company_progress и company_reorgs в таблицу и RPC-функции.
-- Это обновление для текущей схемы: добавляет 2 новых поля и обновляет существующие RPC-функции.
-- Запуск: Supabase → SQL Editor → вставить файл целиком → Run.

-- ---------- добавить столбцы ----------

alter table game.players
  add column if not exists company_progress integer not null default 0,
  add column if not exists company_reorgs integer not null default 0;

-- ---------- обновить ef_save_progress ----------

-- ef_save_progress — принимает все поля игрока и сохраняет в таблицу.
create or replace function game.ef_save_progress(
  p_telegram_id bigint,
  p_state jsonb,
  p_company_no integer,
  p_company_progress integer,
  p_company_reorgs integer,
  p_lifetime double precision,
  p_score double precision,
  p_save_created_at bigint,
  p_force boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
  cur_score double precision;
begin
  if p_state is null or octet_length(p_state::text) > 1000000 then
    return false;
  end if;

  select score into cur_score from game.players where telegram_id = p_telegram_id;

  insert into game.players as p (
    telegram_id, first_name, last_name, username,
    company_no, company_progress, company_reorgs,
    lifetime, score, state, save_created_at, updated_at
  ) values (
    p_telegram_id, '', '', '',
    p_company_no, p_company_progress, p_company_reorgs,
    p_lifetime, p_score, p_state, p_save_created_at, now()
  ) on conflict (telegram_id) do update
    set first_name = excluded.first_name,
        last_name = excluded.last_name,
        username = excluded.username,
        company_no = excluded.company_no,
        company_progress = excluded.company_progress,
        company_reorgs = excluded.company_reorgs,
        lifetime = excluded.lifetime,
        score = excluded.score,
        state = excluded.state,
        save_created_at = excluded.save_created_at,
        updated_at = now()
  where p_force or excluded.score >= p.score - 1e-6;

  get diagnostics n = row_count;
  return n > 0;
end;
$$;

-- ---------- обновить ef_leaderboard ----------

-- ef_leaderboard — первые p_limit игроков и место самого игрока.
-- Возвращает: { top: [{place, name, company, company_progress, company_reorgs, lifetime, me}], me: {…} }
create or replace function game.ef_leaderboard(
  p_limit integer,
  p_telegram_id bigint
)
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
      'place', place,
      'name', name,
      'company', company_no,
      'company_progress', company_progress,
      'company_reorgs', company_reorgs,
      'lifetime', lifetime,
      'me', telegram_id = p_telegram_id
    ) order by place), '[]'::jsonb)
     from ranked where place <= lim),
    (select jsonb_build_object(
      'place', place,
      'name', name,
      'company', company_no,
      'company_progress', company_progress,
      'company_reorgs', company_reorgs,
      'lifetime', lifetime,
      'me', true
    ) from ranked where telegram_id = p_telegram_id)
  into top, me;
  return jsonb_build_object('top', top, 'me', me);
end;
$$;
