import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { mqttWorker } from '@/lib/mqtt-worker'
import { sendFcmNotification, buildNewDeviceNotification } from '@/lib/fcm'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { mac_address } = body

  if (!mac_address) {
    return Response.json({ error: 'mac_address is required' }, { status: 400 })
  }

  // Normalize MAC address: remove separators, lowercase
  const macNormalized = mac_address.replace(/[:\-\.]/g, '').toLowerCase()
  const macFormatted = mac_address.toUpperCase().replace(/[:\-\.]/g, ':').replace(/(.{2})(?=.)/g, '$1:').substring(0, 17)
  const mqttTopic = `vehi/${macNormalized}`

  // Check if device already exists
  const { data: existing } = await supabaseAdmin
    .from('devices')
    .select('id, mqtt_topic')
    .eq('mac_address', macFormatted)
    .single()

  if (existing) {
    mqttWorker.subscribeDevice(existing.id, existing.mqtt_topic)
    return Response.json({
      device_id: existing.id,
      mqtt_topic: existing.mqtt_topic,
      is_new: false,
    })
  }

  // Create new device
  const { data: device, error } = await supabaseAdmin
    .from('devices')
    .insert({
      mac_address: macFormatted,
      mqtt_topic: mqttTopic,
      status: 'offline',
      is_configured: false,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Create in-app notification
  await supabaseAdmin.from('notifications').insert({
    type: 'new_device',
    device_id: device.id,
    message: `Thiết bị mới đã đăng ký: MAC ${macFormatted}. Vui lòng cập nhật thông tin phương tiện.`,
    is_read: false,
  })

  // Send FCM push notification to all registered mobile devices
  const { data: tokenRows } = await supabaseAdmin.from('fcm_tokens').select('token')
  if (tokenRows && tokenRows.length > 0) {
    const tokens = tokenRows.map((r: { token: string }) => r.token)
    const notifPayload = buildNewDeviceNotification(macFormatted, device.id)
    const { failedTokens } = await sendFcmNotification({ ...notifPayload, tokens })
    if (failedTokens.length > 0) {
      await supabaseAdmin.from('fcm_tokens').delete().in('token', failedTokens)
    }
  }

  // Subscribe to MQTT topic
  await mqttWorker.initialize()
  mqttWorker.subscribeDevice(device.id, mqttTopic)

  return Response.json({
    device_id: device.id,
    mqtt_topic: mqttTopic,
    is_new: true,
  })
}
