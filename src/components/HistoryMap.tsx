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

function HistoryMapInner({ batches, deviceLabel }: HistoryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null)
  // Track drawn layers so we can clear them without removing tile layer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawnLayersRef = useRef<any[]>([])

  // Init map once
  useEffect(() => {
    if (!containerRef.current) return

    import('leaflet').then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      if (mapRef.current) return

      LRef.current = L
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
      LRef.current = null
      drawnLayersRef.current = []
    }
  }, [])

  // Draw routes whenever batches change
  useEffect(() => {
    if (batches.length === 0) return

    function draw() {
      const L = LRef.current
      const map = mapRef.current
      if (!L || !map) return

      // Clear previous drawn layers
      drawnLayersRef.current.forEach(layer => layer.remove())
      drawnLayersRef.current = []

      // Collect all valid points across all batches
      const allPoints: ReturnType<typeof L.latLng>[] = []
      for (const batch of batches) {
        if (!batch.positions?.length) continue
        for (const pos of batch.positions) {
          // Filter out invalid positions (0,0 or missing)
          if (pos.lat && pos.lng && !(Math.abs(pos.lat) < 0.001 && Math.abs(pos.lng) < 0.001)) {
            allPoints.push(L.latLng(pos.lat, pos.lng))
          }
        }
      }

      // Fallback: use start/end points from batches if no positions array
      if (allPoints.length === 0) {
        for (const batch of batches) {
          if (batch.start_lat && batch.start_lng) {
            allPoints.push(L.latLng(batch.start_lat, batch.start_lng))
          }
          if (batch.end_lat && batch.end_lng) {
            allPoints.push(L.latLng(batch.end_lat, batch.end_lng))
          }
        }
      }

      if (allPoints.length === 0) return

      // Draw route polyline
      const polyline = L.polyline(allPoints, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.85,
        lineJoin: 'round',
      }).addTo(map)
      drawnLayersRef.current.push(polyline)

      // Speed-colored waypoint dots every N points (to avoid clutter)
      const step = Math.max(1, Math.floor(allPoints.length / 50))
      for (let i = step; i < allPoints.length - step; i += step) {
        const batch = batches.find(b => b.positions?.length)
        const pos = batch?.positions?.[Math.floor(i / step)] // approximate
        const spd = pos?.speed ?? 0
        const dotColor = spd > 30 ? '#ef4444' : spd > 10 ? '#f59e0b' : '#3b82f6'
        const dot = L.circleMarker(allPoints[i], {
          radius: 4,
          fillColor: dotColor,
          color: 'white',
          weight: 1.5,
          fillOpacity: 0.9,
        }).addTo(map)
        drawnLayersRef.current.push(dot)
      }

      // Start marker (green)
      const startIcon = L.divIcon({
        html: `<div style="
          width:28px;height:28px;border-radius:50%;
          background:linear-gradient(135deg,#10b981,#059669);
          border:3px solid white;box-shadow:0 3px 10px rgba(16,185,129,0.5);
          display:flex;align-items:center;justify-content:center;
          font-size:13px;line-height:1
        ">▶</div>`,
        className: '', iconSize: [28, 28], iconAnchor: [14, 14],
      })

      // End marker (red)
      const endIcon = L.divIcon({
        html: `<div style="
          width:28px;height:28px;border-radius:50%;
          background:linear-gradient(135deg,#ef4444,#dc2626);
          border:3px solid white;box-shadow:0 3px 10px rgba(239,68,68,0.5);
          display:flex;align-items:center;justify-content:center;
          font-size:13px;line-height:1
        ">■</div>`,
        className: '', iconSize: [28, 28], iconAnchor: [14, 14],
      })

      const startMarker = L.marker(allPoints[0], { icon: startIcon })
        .bindPopup(`<b>Xuất phát</b><br>${deviceLabel || ''}`)
        .addTo(map)
      drawnLayersRef.current.push(startMarker)

      const endMarker = L.marker(allPoints[allPoints.length - 1], { icon: endIcon })
        .bindPopup(`<b>Kết thúc</b><br>${deviceLabel || ''}`)
        .addTo(map)
      drawnLayersRef.current.push(endMarker)

      map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40], maxZoom: 17 })
    }

    // Map may not be ready yet — poll until it is
    if (mapRef.current && LRef.current) {
      draw()
    } else {
      const check = setInterval(() => {
        if (mapRef.current && LRef.current) {
          clearInterval(check)
          draw()
        }
      }, 100)
      return () => clearInterval(check)
    }
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
