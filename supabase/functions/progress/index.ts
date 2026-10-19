import { createClient } from 'npm:@supabase/supabase-js@2'

function key(kind: 'secret' | 'publishable'): string {
  const dict = Deno.env.get(kind === 'secret' ? 'SUPABASE_SECRET_KEYS' : 'SUPABASE_PUBLISHABLE_KEYS')
  if (dict) {
    try {
      const value = JSON.parse(dict).default
      if (value) return value
    } catch {
      // legacy
    }
  }
  return Deno.env.get(kind === 'secret' ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_ANON_KEY') ?? ''
}

Deno.serve(async (req) => {
  // CORS заголовки для доступа из браузера
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  const url = Deno.env.get('SUPABASE_URL')
  if (!url) return new Response(JSON.stringify({ error: 'not_configured' }), { status: 500, headers })

  try {
    const { action, telegram_id, state, company_no, lifetime, score, save_created_at, force, p_limit } = await req.json()

    const supabase = createClient(url, key('secret'), { auth: { persistSession: false, autoRefreshToken: false } })

    if (action === 'load') {
      const { data, error } = await supabase.rpc('ef_load_progress', { p_telegram_id: telegram_id })
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
      if (!data) return new Response(JSON.stringify({ state: null, save_created_at: 0 }), { headers })
      return new Response(JSON.stringify({ state: data.state, save_created_at: data.save_created_at }), { headers })
    }

    if (action === 'save') {
      const success = await supabase.rpc('ef_save_progress', {
        p_telegram_id: telegram_id,
        p_state: state,
        p_company_no: company_no,
        p_lifetime: lifetime,
        p_score: score,
        p_save_created_at: save_created_at || Date.now(),
        p_force: force || false,
      })
      if (success === false) return new Response(JSON.stringify({ success: false, reason: 'stale' }), { headers })
      return new Response(JSON.stringify({ success: !!success }), { headers })
    }

    if (action === 'leaderboard') {
      const { data, error } = await supabase.rpc('ef_leaderboard', { p_limit: p_limit || 100, p_telegram_id: telegram_id })
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
      return new Response(JSON.stringify(data), { headers })
    }

    return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400, headers })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
})
