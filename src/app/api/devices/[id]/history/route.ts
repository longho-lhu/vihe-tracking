import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = request.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const limit = parseInt(searchParams.get('limit') || '200', 10)

  if (!from || !to) {
    return Response.json({ error: 'from and to query params are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('location_history')
    .select('*')
    .eq('device_id', id)
    .gte('recorded_at', from)
    .lte('recorded_at', to)
    .order('recorded_at', { ascending: true })
    .limit(limit)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
