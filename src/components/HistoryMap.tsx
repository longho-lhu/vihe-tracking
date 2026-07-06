'use client'

import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

interface PositionPoint {
  lat: number
  lng: number
  speed: number
  ts: number
}

export interface HistoryBatch {
  id: string
  recorded_at: string
  positions: PositionPoint[]
  start_lat?: number
  start_lng?: number
  end_lat?: number
  end_lng?: number
}

interface HistoryMapProps {
  batches: HistoryBatch[]
  deviceLabel?: string
}

// Inner component that uses Leaflet (client-only)
function HistoryMapInner({ batches, deviceLabel }: HistoryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return
    // Dynamic import to avoid SSR issues
    import('leaflet').then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      if (mapRef.current) return // Already initialized

      mapRef.current = L.map(containerRef.current!, {
        center: [10.762622, 106.660172],
        zoom: 13,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current)
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || batches.length === 0) return

    import('leaflet').then((L) => {
      if (!mapRef.current) return

      // Clear existing layers except tile layer
      mapRef.current.eachLayer((layer: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((layer as any) instanceof L.Polyline || (layer as any) instanceof L.Marker) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (layer as any).remove()
        }
      })

      // Collect all points
      const allPoints: ReturnType<typeof L.latLng>[] = []
      for (const batch of batches) {
        if (!batch.positions?.length) continue
        for (const pos of batch.positions) {
          allPoints.push(L.latLng(pos.lat, pos.lng))
        }
      }

      if (allPoints.length === 0) return

      // Draw the route
      L.polyline(allPoints, { color: '#3b82f6', weight: 3, opacity: 0.8 }).addTo(mapRef.current)

      // Markers
      const startIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#10b981;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        className: '', iconSize: [14, 14], iconAnchor: [7, 7],
      })
      const endIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        className: '', iconSize: [14, 14], iconAnchor: [7, 7],
      })

      L.marker(allPoints[0], { icon: startIcon })
        .bindPopup(`<b>Bắt đầu</b><br>${deviceLabel || ''}`)
        .addTo(mapRef.current)

      L.marker(allPoints[allPoints.length - 1], { icon: endIcon })
        .bindPopup(`<b>Kết thúc</b><br>${deviceLabel || ''}`)
        .addTo(mapRef.current)

      mapRef.current.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40] })
    })
  }, [batches, deviceLabel])

  return <div ref={containerRef} style={{ height: '100%', minHeight: '400px', borderRadius: 16, zIndex: 1 }} />
}

// Wrap with dynamic to disable SSR
const HistoryMap = dynamic(() => Promise.resolve(HistoryMapInner), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', borderRadius: 16 }}>
      <div className="spinner" />
    </div>
  ),
})

export default HistoryMap
