'use client'

import { useEffect, useRef } from 'react'

interface Position {
  lat: number
  lng: number
  speed?: number
  ts?: number
}

interface LeafletLiveMapProps {
  position: Position | null
  deviceLabel?: string
}

export default function LeafletLiveMap({ position, deviceLabel }: LeafletLiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pathRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pathPointsRef = useRef<any[]>([])

  useEffect(() => {
    if (!containerRef.current) return

    const defaultCenter: [number, number] = [10.762622, 106.660172]

    import('leaflet').then((L) => {
      import('leaflet/dist/leaflet.css' as string)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      if (mapRef.current) return

      mapRef.current = L.map(containerRef.current!, {
        center: defaultCenter,
        zoom: 15,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current)
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
      pathRef.current = null
      pathPointsRef.current = []
    }
  }, [])

  useEffect(() => {
    if (!position) return
    if (!mapRef.current) return

    import('leaflet').then((L) => {
      const latlng = L.latLng(position.lat, position.lng)

      const vehicleIcon = L.divIcon({
        html: `<div style="
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(37,99,235,0.5), 0 0 0 6px rgba(37,99,235,0.15);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
        ">📍</div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })

      if (!markerRef.current) {
        markerRef.current = L.marker(latlng, { icon: vehicleIcon })
          .bindPopup(`<b>${deviceLabel || 'Phương tiện'}</b><br>Tốc độ: ${Math.round(position.speed || 0)} km/h`)
          .addTo(mapRef.current)
      } else {
        markerRef.current.setLatLng(latlng)
        markerRef.current.setPopupContent(
          `<b>${deviceLabel || 'Phương tiện'}</b><br>Tốc độ: ${Math.round(position.speed || 0)} km/h`
        )
      }

      pathPointsRef.current.push(latlng)
      if (pathPointsRef.current.length > 200) pathPointsRef.current.shift()

      if (!pathRef.current) {
        pathRef.current = L.polyline(pathPointsRef.current, {
          color: '#3b82f6', weight: 3, opacity: 0.7, dashArray: '6 4',
        }).addTo(mapRef.current)
      } else {
        pathRef.current.setLatLngs(pathPointsRef.current)
      }

      mapRef.current.panTo(latlng, { animate: true, duration: 0.5 })
    })
  }, [position, deviceLabel])

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', minHeight: '400px', borderRadius: 16, zIndex: 1 }}
    />
  )
}
