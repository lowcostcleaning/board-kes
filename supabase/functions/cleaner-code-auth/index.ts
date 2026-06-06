import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const generateCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const serviceClient = createClient(supabaseUrl, serviceRoleKey)
    const payload = await req.json()

    if (payload.action === 'login') {
      const code = String(payload.code || '').trim().toUpperCase()

      if (!code) {
        return jsonResponse({ error: 'Введите код' }, 400)
      }

      const { data: profile, error: profileError } = await serviceClient
        .from('profiles')
        .select('id, email, role, status, is_active')
        .eq('cleaner_access_code', code)
        .in('role', ['cleaner', 'demo_cleaner'])
        .eq('status', 'approved')
        .eq('is_active', true)
        .maybeSingle()

      if (profileError) {
        console.error('Cleaner code lookup failed:', profileError)
        return jsonResponse({ error: 'Не удалось проверить код' }, 500)
      }

      if (!profile?.email) {
        return jsonResponse({ error: 'Код не найден или клинер неактивен' }, 401)
      }

      const publicClient = createClient(supabaseUrl, anonKey)
      const { data: signInData, error: signInError } = await publicClient.auth.signInWithPassword({
        email: profile.email,
        password: code,
      })

      if (signInError || !signInData.session) {
        console.error('Cleaner code sign in failed:', signInError)
        return jsonResponse({ error: 'Код не найден или устарел' }, 401)
      }

      return jsonResponse({ session: signInData.session })
    }

    if (payload.action === 'generate') {
      const authHeader = req.headers.get('authorization')
      if (!authHeader) {
        return jsonResponse({ error: 'Unauthorized' }, 401)
      }

      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })

      const { data: userData, error: userError } = await userClient.auth.getUser()
      if (userError || !userData.user) {
        return jsonResponse({ error: 'Unauthorized' }, 401)
      }

      const { data: adminProfile } = await serviceClient
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle()

      if (adminProfile?.role !== 'admin') {
        return jsonResponse({ error: 'Forbidden' }, 403)
      }

      const cleanerId = String(payload.cleanerId || '')
      if (!cleanerId) {
        return jsonResponse({ error: 'cleanerId is required' }, 400)
      }

      const { data: cleaner, error: cleanerError } = await serviceClient
        .from('profiles')
        .select('id, email, role, is_active')
        .eq('id', cleanerId)
        .in('role', ['cleaner', 'demo_cleaner'])
        .maybeSingle()

      if (cleanerError) {
        console.error('Cleaner lookup failed:', cleanerError)
        return jsonResponse({ error: 'Не удалось найти клинера' }, 500)
      }

      if (!cleaner?.email || !cleaner.is_active) {
        return jsonResponse({ error: 'Клинер не найден или неактивен' }, 404)
      }

      let code = generateCode()
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data: existing } = await serviceClient
          .from('profiles')
          .select('id')
          .eq('cleaner_access_code', code)
          .maybeSingle()

        if (!existing) break
        code = generateCode()
      }

      const { error: authError } = await serviceClient.auth.admin.updateUserById(cleaner.id, {
        password: code,
      })

      if (authError) {
        console.error('Failed to update cleaner auth password:', authError)
        return jsonResponse({ error: 'Не удалось обновить код входа' }, 500)
      }

      const { error: profileUpdateError } = await serviceClient
        .from('profiles')
        .update({ cleaner_access_code: code })
        .eq('id', cleaner.id)

      if (profileUpdateError) {
        console.error('Failed to save cleaner access code:', profileUpdateError)
        return jsonResponse({ error: 'Не удалось сохранить код входа' }, 500)
      }

      return jsonResponse({ code })
    }

    return jsonResponse({ error: 'Unknown action' }, 400)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('cleaner-code-auth error:', error)
    return jsonResponse({ error: message }, 500)
  }
})
