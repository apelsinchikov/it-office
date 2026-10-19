import { serve } from 'https://deno.land/x/supabase_mod@latest/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

Deno.serve(async (req) => {
  const { action, telegram_id, state, company_no, lifetime, score, save_created_at, force, p_limit } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  if (action === 'load') {
    const { data, error } = await supabase
      .from('players')
      .select('state, save_created_at')
      .eq('telegram_id', telegram_id)
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    if (!data) return new Response(JSON.stringify({ state: null, save_created_at: 0 }))

    return new Response(JSON.stringify({ state: data.state, save_created_at: data.save_created_at }))
  }

  if (action === 'save') {
    // Проверяем текущий score на сервере
    const { data: existing, error: loadError } = await supabase
      .from('players')
      .select('score, save_created_at')
      .eq('telegram_id', telegram_id)
      .single()

    if (loadError) return new Response(JSON.stringify({ error: loadError.message }), { status: 500 })

    // Если сохранение старее — не принимаем (если не force)
    if (existing && !force && save_created_at && existing.save_created_at >= save_created_at) {
      return new Response(JSON.stringify({ success: false, reason: 'stale' }))
    }

    // Обновляем state и метаданные
    const { error: saveError } = await supabase
      .from('players')
      .update({
        state,
        company_no,
        lifetime,
        score,
        save_created_at: save_created_at || Date.now(),
        updated_at: new Date().toISOString()
      })
      .eq('telegram_id', telegram_id)

    if (saveError) return new Response(JSON.stringify({ error: saveError.message }), { status: 500 })

    return new Response(JSON.stringify({ success: true }))
  }

  if (action === 'leaderboard') {
    const limit = p_limit || 100
    const { data, error } = await supabase
      .from('players')
      .select('telegram_id, first_name, last_name, username, company_no, lifetime, score')
      .order('score', { ascending: false })
      .limit(limit)

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

    const top = (data || []).map((p, i) => ({
      place: i + 1,
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      company: p.company_no,
      lifetime: p.lifetime,
      me: p.telegram_id === telegram_id
    }))

    const me = top.find(r => r.me) || null

    return new Response(JSON.stringify({ top, me }))
  }

  return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400 })
})
