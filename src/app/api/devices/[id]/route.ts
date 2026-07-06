import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('devices')
    .select(`*, owner:accounts(id, username, display_name)`)
    .eq('id', id)
    .single()

  if (error || !data) return Response.json({ error: 'Device not found' }, { status: 404 })
  return Response.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { license_plate, vehicle_type, owner_id } = body

  const updateData: Record<string, string | null> = {}
  if (license_plate !== undefined) updateData.license_plate = license_plate
  if (vehicle_type !== undefined) updateData.vehicle_type = vehicle_type
  if (owner_id !== undefined) updateData.owner_id = owner_id

  const { data, error } = await supabaseAdmin
    .from('devices')
    .update({ ...updateData, is_configured: true })
    .eq('id', id)
    .select(`*, owner:accounts(id, username, display_name)`)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data) return Response.json({ error: 'Device not found' }, { status: 404 })

  return Response.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { error } = await supabaseAdmin
    .from('devices')
    .delete()
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ message: 'Device deleted' })
}
