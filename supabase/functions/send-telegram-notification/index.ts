import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Restrict CORS to known origins (server-side triggers use authorization header)
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'https://hiulglwzolseqbsgvacq.lovableproject.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  user_id: string
  event_type: 'new_order' | 'order_status_changed' | 'new_message' | 'order_completed'
  data?: Record<string, any>
}

Deno.serve(async (req) => {
  console.log('=== Edge Function send-telegram-notification called ===')
  console.log('Request method:', req.method)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Explicit authentication check (defense in depth - platform JWT verification also enabled)
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')

    if (!n8nWebhookUrl) {
      console.error('N8N_WEBHOOK_URL is not configured')
      return new Response(
        JSON.stringify({ error: 'N8N webhook URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload: NotificationPayload = await req.json()
    const { user_id, event_type, data } = payload

    console.log(`Processing notification for user ${user_id}, event: ${event_type}`)

    // Get user profile with telegram settings
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('telegram_chat_id, telegram_enabled, name, email')
      .eq('id', user_id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile.telegram_enabled || !profile.telegram_chat_id) {
      console.log(`Telegram notifications disabled or not configured for user ${user_id}`)
      return new Response(
        JSON.stringify({ success: true, sent: false, reason: 'Telegram not enabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send webhook to n8n
    console.log(`Sending webhook to n8n for chat_id: ${profile.telegram_chat_id}`)
    
    const webhookPayload = {
      telegram_chat_id: profile.telegram_chat_id,
      event_type,
      user_name: profile.name || profile.email,
      data,
      timestamp: new Date().toISOString()
    }

    const webhookResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    })

    if (!webhookResponse.ok) {
      console.error(`Webhook failed with status ${webhookResponse.status}`)
      return new Response(
        JSON.stringify({ error: 'Failed to send webhook' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Webhook sent successfully')

    return new Response(
      JSON.stringify({ success: true, sent: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error processing notification:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
