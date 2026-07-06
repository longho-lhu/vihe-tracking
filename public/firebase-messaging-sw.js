// Firebase Cloud Messaging Service Worker
// File này PHẢI nằm tại /public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// Config được truyền từ client qua URL query string khi đăng ký SW
// hoặc tự đọc từ cookie/metadata
let firebaseConfig = null

// Nhận config từ client page
self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.config

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig)
    }

    const messaging = firebase.messaging()

    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Background message:', payload)

      const title = payload.notification?.title || 'VehiTrack'
      const body = payload.notification?.body || ''
      const data = payload.data || {}

      self.registration.showNotification(title, {
        body,
        icon: '/favicon.ico',
        tag: data.device_id || 'vehi-notification',
        data: { url: data.device_id ? `/devices/${data.device_id}` : '/' },
        vibrate: [200, 100, 200],
        requireInteraction: data.type === 'new_device',
      })
    })
  }
})

// Click notification → mở/focus tab
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus()
          client.navigate && client.navigate(url)
          return
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
