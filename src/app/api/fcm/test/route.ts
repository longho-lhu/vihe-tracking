import { supabaseAdmin } from '@/lib/supabase'
import { sendFcmNotification } from '@/lib/fcm'

/**
 * POST /api/fcm/test
 * Gửi thông báo test đến tất cả FCM tokens đã đăng ký
 * Chỉ dùng để debug/test
 */
export async function POST() {
  // Lấy tất cả tokens
  const { data: tokenRows, error } = await supabaseAdmin
    .from('fcm_tokens')
    .select('token, device_label, platform')

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  if (!tokenRows || tokenRows.length === 0) {
    return Response.json({
      error: 'Không có FCM token nào. Hãy bật thông báo trên Chrome trước.',
    }, { status: 400 })
  }

  const tokens = tokenRows.map((r: { token: string }) => r.token)

  const { successCount, failedTokens } = await sendFcmNotification({
    tokens,
    title: '🚗 VehiTrack - Test thông báo',
    body: `Thông báo hoạt động bình thường! Thời gian: ${new Date().toLocaleTimeString('vi-VN')}`,
    data: {
      type: 'test',
      device_id: '',
    },
  })

  // Xóa token hỏng
  if (failedTokens.length > 0) {
    await supabaseAdmin.from('fcm_tokens').delete().in('token', failedTokens)
  }

  return Response.json({
    message: `Đã gửi thành công đến ${successCount}/${tokens.length} thiết bị`,
    successCount,
    totalTokens: tokens.length,
    failedCount: failedTokens.length,
    tokens: tokenRows.map((r: { token: string; device_label: string; platform: string }) => ({
      device_label: r.device_label,
      platform: r.platform,
      token_preview: r.token.substring(0, 20) + '...',
    })),
  })
}

/**
 * GET /api/fcm/test
 * Xem danh sách tokens đã đăng ký
 */
export async function GET() {
  const { data: tokenRows, error } = await supabaseAdmin
    .from('fcm_tokens')
    .select('id, device_label, platform, created_at, last_used_at')
    .order('last_used_at', { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({
    count: tokenRows?.length || 0,
    tokens: tokenRows,
  })
}
