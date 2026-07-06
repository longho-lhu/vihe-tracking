import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let app: FirebaseApp | null = null
let messaging: Messaging | null = null

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('your-')) return null

  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  }
  return app
}

export function getFirebaseMessaging(): Messaging | null {
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) return null
  if (!messaging) {
    try {
      messaging = getMessaging(firebaseApp)
    } catch {
      return null
    }
  }
  return messaging
}

/**
 * Đăng ký service worker và gửi Firebase config cho nó
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

  // Chờ service worker active
  await new Promise<void>((resolve) => {
    if (registration.active) {
      resolve()
      return
    }
    const sw = registration.installing || registration.waiting
    if (sw) {
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') resolve()
      })
    } else {
      resolve()
    }
  })

  // Gửi config cho service worker
  const target = registration.active || registration.waiting || registration.installing
  if (target) {
    target.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig })
  }

  // Cũng gửi tới tất cả clients
  registration.active?.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig })

  return registration
}

/**
 * Xin quyền thông báo và lấy FCM token
 */
export async function requestNotificationPermission(vapidKey: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) return null
  if (!('serviceWorker' in navigator)) return null

  const fbMessaging = getFirebaseMessaging()
  if (!fbMessaging) {
    console.error('[FCM Client] Firebase not configured or failed to initialize')
    return null
  }

  // Xin quyền
  const permission = await Notification.requestPermission()
  console.log('[FCM Client] Permission result:', permission)
  if (permission !== 'granted') return null

  try {
    const registration = await registerServiceWorker()
    console.log('[FCM Client] Service worker registered:', registration.scope)

    const token = await getToken(fbMessaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    })

    console.log('[FCM Client] Token obtained:', token ? 'yes (' + token.substring(0, 20) + '...)' : 'null')
    return token || null
  } catch (err) {
    console.error('[FCM Client] getToken failed:', err)
    return null
  }
}

/**
 * Lắng nghe message khi tab đang mở (foreground)
 */
export function onForegroundMessage(
  callback: (payload: {
    notification?: { title?: string; body?: string }
    data?: Record<string, string>
  }) => void
) {
  const fbMessaging = getFirebaseMessaging()
  if (!fbMessaging) return () => {}
  return onMessage(fbMessaging, callback)
}
