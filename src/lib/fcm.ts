import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

let firebaseApp: App | null = null

// Prevent multiple initializations in Next.js hot reload
if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  const hasValidConfig =
    projectId &&
    clientEmail &&
    privateKey &&
    !projectId.includes('your-firebase') &&
    !privateKey.includes('Your private key')

  if (hasValidConfig) {
    try {
      firebaseApp = initializeApp({
        credential: cert({ projectId: projectId!, clientEmail: clientEmail!, privateKey: privateKey! }),
      })
      console.log('[FCM] Firebase Admin initialized')
    } catch (err) {
      console.error('[FCM] Failed to initialize Firebase Admin:', err)
    }
  } else {
    console.warn('[FCM] Firebase credentials not configured — push notifications disabled')
  }
} else {
  firebaseApp = getApps()[0]
}

const isFirebaseReady = !!firebaseApp


export type DeviceStatus = 'moving' | 'waiting' | 'sleeping' | 'offline'

const STATUS_LABELS: Record<DeviceStatus, string> = {
  moving: 'Đang di chuyển 🚗',
  waiting: 'Đang chờ ⏸️',
  sleeping: 'Chế độ ngủ 💤',
  offline: 'Offline 📴',
}

export interface FcmPayload {
  tokens: string[]
  title: string
  body: string
  data?: Record<string, string>
}

/**
 * Send FCM notification to a list of tokens
 * Returns arrays of successful and failed tokens
 */
export async function sendFcmNotification(payload: FcmPayload): Promise<{
  successCount: number
  failedTokens: string[]
}> {
  if (!isFirebaseReady) {
    console.warn('[FCM] Skipping notification — Firebase not configured')
    return { successCount: 0, failedTokens: [] }
  }

  if (!payload.tokens.length) {
    return { successCount: 0, failedTokens: [] }
  }

  try {
    const messaging = getMessaging(firebaseApp!)
    const response = await messaging.sendEachForMulticast({
      tokens: payload.tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'vehi-tracking',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    })

    const failedTokens: string[] = []
    response.responses.forEach((resp, i) => {
      if (!resp.success) {
        console.error(`[FCM] Failed to send to token ${i}:`, resp.error?.message)
        // Token is invalid/expired — mark for removal
        if (
          resp.error?.code === 'messaging/registration-token-not-registered' ||
          resp.error?.code === 'messaging/invalid-registration-token'
        ) {
          failedTokens.push(payload.tokens[i])
        }
      }
    })

    return { successCount: response.successCount, failedTokens }
  } catch (err) {
    console.error('[FCM] Send error:', err)
    return { successCount: 0, failedTokens: [] }
  }
}

/**
 * Build notification payload for device status change
 */
export function buildStatusChangeNotification(
  deviceLabel: string,
  oldStatus: DeviceStatus,
  newStatus: DeviceStatus,
  deviceId: string
): Omit<FcmPayload, 'tokens'> {
  return {
    title: `${deviceLabel} — Thay đổi trạng thái`,
    body: `${STATUS_LABELS[oldStatus]} → ${STATUS_LABELS[newStatus]}`,
    data: {
      type: 'status_change',
      device_id: deviceId,
      old_status: oldStatus,
      new_status: newStatus,
    },
  }
}

/**
 * Build notification for new device registered
 */
export function buildNewDeviceNotification(
  macAddress: string,
  deviceId: string
): Omit<FcmPayload, 'tokens'> {
  return {
    title: 'Thiết bị mới đăng ký',
    body: `MAC: ${macAddress} — Vui lòng cập nhật thông tin phương tiện`,
    data: {
      type: 'new_device',
      device_id: deviceId,
      mac_address: macAddress,
    },
  }
}
