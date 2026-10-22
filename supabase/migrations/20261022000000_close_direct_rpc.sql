-- Закрыть прямой вызов функций ef_* из браузера.
-- Сейчас их можно вызвать одним publishable-ключом и прочитать или перезаписать сохранение любого игрока.
-- Edge Function `progress` ходит в базу секретным ключом (роль service_role), поэтому игра продолжит работать:
-- права оставляем только этой роли. Данные игроков скрипт не трогает.
-- Запуск: Supabase → SQL Editor → вставить файл целиком → Run. Можно запускать повторно.

do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'game')
       and p.proname in ('ef_load_progress', 'ef_save_progress', 'ef_leaderboard')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
    raise notice 'закрыто: %', f;
  end loop;
end;
$$;
