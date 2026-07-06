import mqtt, { MqttClient, IClientOptions } from 'mqtt'
import { supabaseAdmin } from './supabase'
import {
  sendFcmNotification,
  buildStatusChangeNotification,
  type DeviceStatus,
} from './fcm'

// ============================================================
// Types matching the MQTT payload from the device firmware
// ============================================================
interface DevicePayload {
  lat: number
  lon: number                           // Note: device sends "lon", not "lng"
  pos_source: 'gps' | 'cell' | 'none'  // Position source
  gps_status: 'FIX' | 'NO_FIX'
  sim_status: 'READY' | 'NOT_READY'
  network_status: 'ATTACHED' | 'NOT_ATTACHED'
  speed: number                         // km/h
  alt: number                           // altitude in meters
  system_status: 'MOVING' | 'STOPPED' | 'SLEEPING'
  time: string                          // "2026-07-06 08:15:23 UTC" or "Unknown"
}

interface PositionPoint {
  lat: number
  lng: number
  speed: number
  alt: number
  pos_source: string
  ts: number
}

interface DeviceBatch {
  deviceId: string
  topic: string
  positions: PositionPoint[]
  batchStartTime: number
  lastMessageTime: number
}

// ============================================================
// Map device system_status → internal DeviceStatus
// STOPPED → 'waiting' (short stop), device will send SLEEPING when extended
// ============================================================
function mapDeviceStatus(systemStatus: string): DeviceStatus {
  switch (systemStatus) {
    case 'MOVING':   return 'moving'
    case 'SLEEPING': return 'sleeping'
    case 'STOPPED':  return 'waiting'
    default:         return 'waiting'
  }
}

// Parse device time string → ISO or undefined
function parseDeviceTime(timeStr: string): string | null {
  if (!timeStr || timeStr === 'Unknown') return null
  try {
    // Format: "2026-07-06 08:15:23 UTC"
    const cleaned = timeStr.replace(' UTC', 'Z').replace(' ', 'T')
    const date = new Date(cleaned)
    if (isNaN(date.getTime())) return null
    return date.toISOString()
  } catch {
    return null
  }
}

// Check if position is valid (device sends 0,0 when no fix)
function isValidPosition(lat: number, lon: number, posSource: string): boolean {
  if (posSource === 'none') return false
  if (lat === 0 && lon === 0) return false
  if (Math.abs(lat) < 0.001 && Math.abs(lon) < 0.001) return false
  return true
}

// ============================================================
// Offline detection threshold
// If no message received for this long → mark offline
// ============================================================
const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000  // 5 minutes

class MqttWorker {
  private client: MqttClient | null = null
  private batches: Map<string, DeviceBatch> = new Map()
  private batchIntervals: Map<string, NodeJS.Timeout> = new Map()
  private statusCheckInterval: NodeJS.Timeout | null = null
  private isInitialized = false

  async initialize() {
    if (this.isInitialized) return
    this.isInitialized = true

    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883'
    const options: IClientOptions = {
      clientId: process.env.MQTT_CLIENT_ID || `vehi-server-${Date.now()}`,
      clean: true,
      reconnectPeriod: 5000,
    }

    if (process.env.MQTT_USERNAME) {
      options.username = process.env.MQTT_USERNAME
      options.password = process.env.MQTT_PASSWORD
    }

    this.client = mqtt.connect(brokerUrl, options)

    this.client.on('connect', async () => {
      console.log('[MQTT Worker] Connected to broker')
      await this.subscribeAllActiveDevices()
    })

    this.client.on('message', this.handleMessage.bind(this))

    this.client.on('error', (err) => {
      console.error('[MQTT Worker] Error:', err.message)
    })

    this.client.on('reconnect', () => {
      console.log('[MQTT Worker] Reconnecting...')
    })

    // Check offline devices every 60 seconds
    this.statusCheckInterval = setInterval(() => {
      this.checkOfflineDevices()
    }, 60 * 1000)
  }

  async subscribeAllActiveDevices() {
    if (!this.client) return
    const { data: devices } = await supabaseAdmin
      .from('devices')
      .select('id, mqtt_topic')
      .not('mqtt_topic', 'is', null)

    if (!devices) return

    for (const device of devices) {
      this.subscribeDevice(device.id, device.mqtt_topic)
    }
    console.log(`[MQTT Worker] Subscribed to ${devices.length} device topics`)
  }

  subscribeDevice(deviceId: string, topic: string) {
    if (!this.client) return

    this.client.subscribe(topic, { qos: 1 }, (err) => {
      if (err) {
        console.error(`[MQTT Worker] Failed to subscribe to ${topic}:`, err.message)
        return
      }
      if (!this.batches.has(deviceId)) {
        this.startBatch(deviceId, topic)
      }
    })
  }

  private startBatch(deviceId: string, topic: string) {
    this.batches.set(deviceId, {
      deviceId,
      topic,
      positions: [],
      batchStartTime: Date.now(),
      lastMessageTime: Date.now(),
    })

    const interval = setInterval(() => {
      this.saveBatch(deviceId)
    }, 60 * 1000)

    this.batchIntervals.set(deviceId, interval)
  }

  private async handleMessage(topic: string, message: Buffer) {
    try {
      const payload = JSON.parse(message.toString()) as DevicePayload

      // Validate required fields
      if (typeof payload.lat !== 'number' || typeof payload.lon !== 'number') return
      if (!payload.system_status) return

      // Look up device by topic
      const { data: device } = await supabaseAdmin
        .from('devices')
        .select('id, status, license_plate, mac_address')
        .eq('mqtt_topic', topic)
        .single()

      if (!device) return

      const batch = this.batches.get(device.id)
      if (batch) batch.lastMessageTime = Date.now()

      // Map device status (trust the device firmware's state machine)
      const oldStatus = device.status as DeviceStatus
      const newStatus = mapDeviceStatus(payload.system_status)

      // Build DB update — always update telemetry fields
      const dbUpdate: Record<string, unknown> = {
        last_speed: payload.speed ?? 0,
        last_alt: payload.alt ?? 0,
        pos_source: payload.pos_source ?? 'none',
        gps_status: payload.gps_status ?? 'NO_FIX',
        sim_status: payload.sim_status ?? 'NOT_READY',
        network_status: payload.network_status ?? 'NOT_ATTACHED',
        status: newStatus,
        last_seen: new Date().toISOString(),
      }

      // Parse device timestamp if valid
      const deviceTime = parseDeviceTime(payload.time)
      if (deviceTime) dbUpdate.device_time = deviceTime

      // Only update GPS position if we have a valid fix
      const hasValidPos = isValidPosition(payload.lat, payload.lon, payload.pos_source)
      if (hasValidPos) {
        dbUpdate.last_lat = payload.lat
        dbUpdate.last_lng = payload.lon  // note: store as last_lng internally

        // Add to batch for history
        if (batch) {
          batch.positions.push({
            lat: payload.lat,
            lng: payload.lon,
            speed: payload.speed ?? 0,
            alt: payload.alt ?? 0,
            pos_source: payload.pos_source,
            ts: Date.now(),
          })
        }
      }

      // Trigger notification if status changed
      if (newStatus !== oldStatus) {
        await this.handleStatusChange(
          device.id,
          device.license_plate || device.mac_address,
          oldStatus,
          newStatus
        )
      }

      await supabaseAdmin.from('devices').update(dbUpdate).eq('id', device.id)

    } catch (err) {
      console.error('[MQTT Worker] Message parse error:', err)
    }
  }

  /**
   * Check for devices that have gone offline (no messages for >5 min)
   */
  private async checkOfflineDevices() {
    const now = Date.now()

    for (const [deviceId, batch] of this.batches.entries()) {
      const idleMs = now - batch.lastMessageTime
      if (idleMs < OFFLINE_THRESHOLD_MS) continue

      const { data: device } = await supabaseAdmin
        .from('devices')
        .select('id, status, license_plate, mac_address')
        .eq('id', deviceId)
        .single()

      if (!device || device.status === 'offline') continue

      const currentStatus = device.status as DeviceStatus
      console.log(`[MQTT Worker] Device ${device.license_plate || device.mac_address} went offline (idle ${Math.round(idleMs / 1000)}s)`)
      await this.handleStatusChange(deviceId, device.license_plate || device.mac_address, currentStatus, 'offline')
      await supabaseAdmin.from('devices').update({ status: 'offline' }).eq('id', deviceId)
    }
  }

  /**
   * Handle status change: create notification + send FCM push
   */
  private async handleStatusChange(
    deviceId: string,
    deviceLabel: string,
    oldStatus: DeviceStatus,
    newStatus: DeviceStatus
  ) {
    console.log(`[MQTT Worker] Status change: ${deviceLabel} ${oldStatus} → ${newStatus}`)

    await supabaseAdmin.from('notifications').insert({
      type: 'status_change',
      device_id: deviceId,
      message: `${deviceLabel}: ${statusLabel(oldStatus)} → ${statusLabel(newStatus)}`,
      is_read: false,
    })

    const { data: tokenRows } = await supabaseAdmin
      .from('fcm_tokens')
      .select('token')

    if (!tokenRows || tokenRows.length === 0) return

    const tokens = tokenRows.map((r: { token: string }) => r.token)
    const notifPayload = buildStatusChangeNotification(deviceLabel, oldStatus, newStatus, deviceId)

    const { failedTokens } = await sendFcmNotification({ ...notifPayload, tokens })

    if (failedTokens.length > 0) {
      await supabaseAdmin.from('fcm_tokens').delete().in('token', failedTokens)
      console.log(`[FCM] Removed ${failedTokens.length} invalid tokens`)
    }
  }

  private async saveBatch(deviceId: string) {
    const batch = this.batches.get(deviceId)
    if (!batch || batch.positions.length === 0) return

    const positions = [...batch.positions]
    batch.positions = []
    batch.batchStartTime = Date.now()

    const startPos = positions[0]
    const endPos = positions[positions.length - 1]

    try {
      await supabaseAdmin.from('location_history').insert({
        device_id: deviceId,
        recorded_at: new Date().toISOString(),
        positions,
        duration_seconds: 60,
        start_lat: startPos.lat,
        start_lng: startPos.lng,
        end_lat: endPos.lat,
        end_lng: endPos.lng,
      })
    } catch (err) {
      console.error('[MQTT Worker] Failed to save batch:', err)
    }
  }

  getClient(): MqttClient | null {
    return this.client
  }

  isConnected(): boolean {
    return this.client?.connected ?? false
  }
}

function statusLabel(status: DeviceStatus): string {
  const labels: Record<DeviceStatus, string> = {
    moving: 'Đang di chuyển',
    waiting: 'Đang chờ',
    sleeping: 'Ngủ',
    offline: 'Offline',
  }
  return labels[status] || status
}

// Singleton
declare global {
  // eslint-disable-next-line no-var
  var mqttWorker: MqttWorker | undefined
}

export const mqttWorker: MqttWorker = global.mqttWorker ?? new MqttWorker()
if (!global.mqttWorker) {
  global.mqttWorker = mqttWorker
}
