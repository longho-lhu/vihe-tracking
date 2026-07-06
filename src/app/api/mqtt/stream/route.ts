import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import mqtt from 'mqtt'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const deviceId = searchParams.get('device_id')

  if (!deviceId) {
    return Response.json({ error: 'device_id is required' }, { status: 400 })
  }

  const { data: device } = await supabaseAdmin
    .from('devices')
    .select('id, mqtt_topic')
    .eq('id', deviceId)
    .single()

  if (!device) {
    return Response.json({ error: 'Device not found' }, { status: 404 })
  }

  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883'
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const client = mqtt.connect(brokerUrl, {
        clientId: `vehi-sse-${deviceId}-${Date.now()}`,
        clean: true,
        ...(process.env.MQTT_USERNAME ? {
          username: process.env.MQTT_USERNAME,
          password: process.env.MQTT_PASSWORD,
        } : {}),
      })

      client.on('connect', () => {
        client.subscribe(device.mqtt_topic, { qos: 1 })
      })

      client.on('message', (_topic, message) => {
        try {
          const data = JSON.parse(message.toString())
          const sseMessage = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(sseMessage))
        } catch {
          // ignore parse errors
        }
      })

      client.on('error', () => {
        client.end()
        controller.close()
      })

      // Cleanup when client disconnects
      request.signal.addEventListener('abort', () => {
        client.end()
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
