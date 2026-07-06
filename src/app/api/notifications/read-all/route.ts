import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH() {
  try {
    await requireAuth()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ message: 'All notifications marked as read' })
}
