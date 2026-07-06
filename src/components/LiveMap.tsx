'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { formatSpeed } from '@/lib/format'

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
  // Start with initialPosition (from DB) so map shows immediately
  const [position, setPosition] = useState<Position | null>(initialPosition || null)
  const [connected, setConnected] = useState(false)
  const [speed, setSpeed] = useState(initialPosition?.speed || 0)
  const [posSource, setPosSource] = useState<string>('')
  const eventSourceRef = useRef<EventSource | null>(null)

  // Update map when parent passes new initialPosition (from polling)
  // Only update if we haven't received a live SSE update more recently
  const lastSseUpdateRef = useRef<number>(0)
  useEffect(() => {
    if (!initialPosition) return
    // Only apply if SSE hasn't updated in the last 10s (device not sending live)
    if (Date.now() - lastSseUpdateRef.current > 10_000) {
      setPosition(initialPosition)
      setSpeed(initialPosition.speed || 0)
    }
  }, [initialPosition])

  useEffect(() => {
    const es = new EventSource(`/api/mqtt/stream?device_id=${deviceId}`)
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        // Device sends "lon", normalize to "lng"
        const lat = data.lat
        const lng = data.lng ?? data.lon   // accept both field names
        if (lat && lng && (data.pos_source !== 'none')) {
          lastSseUpdateRef.current = Date.now()
          setPosition({ lat, lng, speed: data.speed || 0, ts: Date.now() })
          setSpeed(data.speed || 0)
          setPosSource(data.pos_source || '')
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

  const posLabel = posSource === 'gps' ? 'GPS' : posSource === 'cell' ? 'Cell' : ''

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
        <span>{connected ? 'Live' : 'Offline'}</span>
        {posLabel && (
          <span style={{
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
            padding: '0.1rem 0.4rem', borderRadius: 4,
            background: posSource === 'gps' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
            color: posSource === 'gps' ? '#34d399' : '#fbbf24',
            border: `1px solid ${posSource === 'gps' ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`,
          }}>
            {posLabel}
          </span>
        )}
        {speed >= 0.1 && (
          <span style={{ color: '#60a5fa', fontWeight: 600 }}>
            {formatSpeed(speed)}
          </span>
        )}
      </div>

      <MapComponent position={position} deviceLabel={deviceLabel} />
    </div>
  )
}
