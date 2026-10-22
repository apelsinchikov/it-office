// Edge Function `progress`: прогресс и рейтинг IT-Office.
// Вся логика и проверка подписи Telegram — в функциях базы srv_* (supabase/migrations/20261023000000_progress_server_v2.sql).
// Функция ходит в базу секретным ключом; браузер сам вызвать srv_* не может.
// Ответы совместимы с прежней версией клиента: load → {state, save_created_at}, save → {success}, leaderboard → {top, me}.
// Деплой: Supabase → Edge Functions → progress → Code → вставить файл → Deploy. «Verify JWT» должна быть выключена.

import { createClient } from 'npm:@supabase/supabase-js@2'

function secretKey(): string {
  const dict = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (dict) {
    try {
      const value = JSON.parse(dict).default
      if (value) return value
    } catch {
      // старый формат ключей
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers })
}

const str = (v: unknown, max = 8192): string => (typeof v === 'string' ? v.slice(0, max) : '')
const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (req.method !== 'POST') return reply({ error: 'method' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const key = secretKey()
  if (!url || !key) return reply({ error: 'not_configured' }, 500)
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return reply({ error: 'bad_json' }, 400)
  }

  const action = str(body.action, 32)
  const telegramId = Math.floor(num(body.telegram_id))
  const initData = str(body.init_data)
  const platform = str(body.platform, 32)

  try {
    if (action === 'load') {
      const { data, error } = await db.rpc('srv_load_progress', { p_telegram_id: telegramId, p_init_data: initData, p_platform: platform })
      if (error) throw error
      console.log('load', telegramId, platform, data?.auth)
      return reply({ state: data?.state ?? null, save_created_at: data?.save_created_at ?? 0 })
    }

    if (action === 'save') {
      const { data, error } = await db.rpc('srv_save_progress', {
        p_telegram_id: telegramId,
        p_init_data: initData,
        p_platform: platform,
        p_first_name: str(body.first_name, 64),
        p_last_name: str(body.last_name, 64),
        p_username: str(body.username, 64) || null,
        p_state: body.state ?? null,
        p_company_no: Math.floor(num(body.company_no, 1)),
        p_company_progress: Math.floor(num(body.company_progress)),
        p_company_reorgs: Math.floor(num(body.company_reorgs)),
        p_lifetime: num(body.lifetime),
        p_score: num(body.score),
        p_save_created_at: Math.floor(num(body.save_created_at)),
        p_force: body.force === true,
      })
      if (error) throw error
      console.log('save', telegramId, platform, data?.auth, data?.ok ? 'ok' : data?.reason)
      return reply({ success: data?.ok === true, reason: data?.reason ?? null })
    }

    if (action === 'leaderboard') {
      const { data, error } = await db.rpc('srv_leaderboard', { p_limit: Math.floor(num(body.p_limit, 100)), p_telegram_id: telegramId })
      if (error) throw error
      return reply(data ?? { top: [], me: null })
    }

    if (action === 'auth_stats') {
      // только счётчики по устройствам и видам подписи, без имён и id
      const { data, error } = await db.rpc('srv_auth_stats')
      if (error) throw error
      return reply(data ?? [])
    }

    return reply({ error: 'unknown_action' }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    console.error('progress error', action, message)
    return reply({ success: false, error: message }, 500)
  }
})
