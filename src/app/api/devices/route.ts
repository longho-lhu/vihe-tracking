import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { mqttWorker } from '@/lib/mqtt-worker'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status')

  let query = supabaseAdmin
    .from('devices')
    .select(`
      *,
      owner:accounts(id, username, display_name)
    `)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data)
}

export async function POST() {
  // Initialize MQTT worker on server start
  await mqttWorker.initialize()
  return Response.json({ ok: true })
}
