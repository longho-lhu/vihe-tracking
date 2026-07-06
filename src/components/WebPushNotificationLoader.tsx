'use client'

import dynamic from 'next/dynamic'

const WebPushNotification = dynamic(() => import('./WebPushNotification'), { ssr: false })

export default function WebPushNotificationLoader() {
  return <WebPushNotification />
}
