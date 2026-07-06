import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * POST /api/fcm/register
 * Đăng ký FCM token từ mobile app
 * Body: { token: string, device_label?: string, platform?: 'android' | 'ios' | 'web' }
 * Không cần auth — mobile app gọi sau khi nhận FCM token từ Firebase SDK
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { token, device_label, platform = 'unknown' } = body

  if (!token || typeof token !== 'string') {
    return Response.json({ error: 'token is required' }, { status: 400 })
  }

  // Upsert token (update last_used_at if exists)
  const { error } = await supabaseAdmin
    .from('fcm_tokens')
    .upsert(
      {
        token,
        device_label: device_label || null,
        platform,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'token' }
    )

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ message: 'FCM token registered successfully' })
}

/**
 * DELETE /api/fcm/register
 * Xóa FCM token khi user logout khỏi app mobile
 * Body: { token: string }
 */
export async function DELETE(request: NextRequest) {
  const body = await request.json()
  const { token } = body

  if (!token) {
    return Response.json({ error: 'token is required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('fcm_tokens')
    .delete()
    .eq('token', token)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ message: 'FCM token removed' })
}

/**
 * GET /api/fcm/register
 * Lấy danh sách FCM tokens (admin only)
 */
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('fcm_tokens')
    .select('id, device_label, platform, created_at, last_used_at')
    .order('last_used_at', { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}
