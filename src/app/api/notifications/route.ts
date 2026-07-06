import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const unreadOnly = searchParams.get('unread_only') === 'true'
  const limit = parseInt(searchParams.get('limit') || '30', 10)

  let query = supabaseAdmin
    .from('notifications')
    .select(`*, device:devices(id, mac_address, license_plate)`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data)
}
