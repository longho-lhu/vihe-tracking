import type { Metadata } from 'next'
import './globals.css'
import { Suspense } from 'react'
import WebPushNotificationLoader from '@/components/WebPushNotificationLoader'

export const metadata: Metadata = {
  title: 'VehiTrack - Vehicle Tracking System',
  description: 'Real-time vehicle tracking and management system with GPS monitoring, MQTT integration, and historical route playback.',
  keywords: 'vehicle tracking, GPS, MQTT, real-time, fleet management',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi">
      <body>
        {children}
        <Suspense fallback={null}>
          <WebPushNotificationLoader />
        </Suspense>
      </body>
    </html>
  )
}
