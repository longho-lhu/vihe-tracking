'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

interface Position {
  lat: number
  lng: number
  speed?: number
  ts?: number
}

interface LiveMapProps {
  deviceId: string
  initialPosition?: Position
  deviceLabel?: string
}

// Import Leaflet dynamically (SSR disabled)
const MapComponent = dynamic(() => import('./LeafletLiveMap'), {
  ssr: false,
  loading: () => (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-secondary)', borderRadius: 16,
    }}>
      <div className="spinner" />
    </div>
  ),
})

export default function LiveMap({ deviceId, initialPosition, deviceLabel }: LiveMapProps) {
  const [position, setPosition] = useState<Position | null>(initialPosition || null)
  const [connected, setConnected] = useState(false)
  const [speed, setSpeed] = useState(0)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource(`/api/mqtt/stream?device_id=${deviceId}`)
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.lat && data.lng) {
          setPosition({ lat: data.lat, lng: data.lng, speed: data.speed || 0, ts: Date.now() })
          setSpeed(data.speed || 0)
        }
      } catch {}
    }

    es.onerror = () => {
      setConnected(false)
    }

    return () => {
      es.close()
    }
  }, [deviceId])

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {/* Status bar */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 1000,
        background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(8px)',
        border: '1px solid var(--border)', borderRadius: 10,
        padding: '0.5rem 0.875rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        fontSize: '0.8125rem', color: 'var(--text-primary)',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: connected ? '#10b981' : '#6b7280',
          ...(connected ? { animation: 'pulse-green 2s infinite' } : {}),
          display: 'inline-block',
        }} />
        <span>{connected ? 'Đang kết nối' : 'Mất kết nối'}</span>
        {speed > 0 && (
          <span style={{ color: '#60a5fa', fontWeight: 600 }}>
            {Math.round(speed)} km/h
          </span>
        )}
      </div>

      <MapComponent position={position} deviceLabel={deviceLabel} />
    </div>
  )
}
