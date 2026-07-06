'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import HistoryMap from '@/components/HistoryMap'
import { Calendar, Search, Route } from 'lucide-react'
import { format, subHours } from 'date-fns'

interface Device {
  id: string
  mac_address: string
  license_plate?: string
  vehicle_type?: string
}

interface HistoryBatch {
  id: string
  recorded_at: string
  positions: { lat: number; lng: number; speed: number; ts: number }[]
}

export default function HistoryPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevice, setSelectedDevice] = useState('')
  const [fromDate, setFromDate] = useState(format(subHours(new Date(), 6), "yyyy-MM-dd'T'HH:mm"))
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [batches, setBatches] = useState<HistoryBatch[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    fetch('/api/devices').then(r => r.json()).then(d => {
      setDevices(Array.isArray(d) ? d : [])
      if (d.length > 0) setSelectedDevice(d[0].id)
    })
  }, [])

  const loadHistory = useCallback(async () => {
    if (!selectedDevice) return
    setLoading(true)
    setSearched(true)
    const from = new Date(fromDate).toISOString()
    const to = new Date(toDate).toISOString()
    const res = await fetch(`/api/devices/${selectedDevice}/history?from=${from}&to=${to}&limit=500`)
    if (res.ok) setBatches(await res.json())
    setLoading(false)
  }, [selectedDevice, fromDate, toDate])

  const currentDevice = devices.find(d => d.id === selectedDevice)
  const totalPoints = batches.reduce((s, b) => s + (b.positions?.length || 0), 0)
  const totalDistance = estimateDistance(batches)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Lịch sử hành trình</h1>
          <p className="page-subtitle">Xem lại lộ trình di chuyển của phương tiện</p>
        </div>

        {/* Controls */}
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
            {/* Device select */}
            <div>
              <label className="input-label">Phương tiện</label>
              <select
                id="history-device-select"
                className="select-field"
                style={{ width: '100%' }}
                value={selectedDevice}
                onChange={e => setSelectedDevice(e.target.value)}
              >
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.license_plate || d.mac_address} {d.vehicle_type ? `(${d.vehicle_type})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* From date */}
            <div>
              <label className="input-label">Từ ngày giờ</label>
              <input type="datetime-local" className="input-field" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>

            {/* To date */}
            <div>
              <label className="input-label">Đến ngày giờ</label>
              <input type="datetime-local" className="input-field" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>

            {/* Search button */}
            <button className="btn-primary" onClick={loadHistory} disabled={loading || !selectedDevice} id="search-history-btn">
              {loading ? <span className="spinner" /> : <Search size={16} />}
              {loading ? 'Đang tải...' : 'Tìm kiếm'}
            </button>
          </div>

          {/* Quick time ranges */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Nhanh:</span>
            {[
              { label: '1 giờ qua', hours: 1 },
              { label: '3 giờ qua', hours: 3 },
              { label: '6 giờ qua', hours: 6 },
              { label: 'Hôm nay', hours: 24 },
            ].map(({ label, hours }) => (
              <button
                key={label}
                onClick={() => {
                  setFromDate(format(subHours(new Date(), hours), "yyyy-MM-dd'T'HH:mm"))
                  setToDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
                }}
                className="btn-secondary"
                style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {searched && !loading && batches.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <div className="stat-card">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <Route size={18} color="#60a5fa" />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tổng điểm</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{totalPoints.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <Calendar size={18} color="#34d399" />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Số batch</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{batches.length}</div>
            </div>
            <div className="stat-card">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <Route size={18} color="#fbbf24" />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quãng đường (ước tính)</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{totalDistance.toFixed(1)} km</div>
            </div>
          </div>
        )}

        {/* Map */}
        {searched && (
          <div style={{ display: 'grid', gridTemplateColumns: batches.length > 0 ? '1fr 300px' : '1fr', gap: '1rem' }}>
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', height: '500px' }}>
              {loading ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="spinner" style={{ width: 40, height: 40 }} />
                </div>
              ) : batches.length > 0 ? (
                <HistoryMap batches={batches} deviceLabel={currentDevice?.license_plate} />
              ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '0.75rem' }}>
                  <Calendar size={48} style={{ opacity: 0.3 }} />
                  <p>Không có dữ liệu trong khoảng thời gian này</p>
                </div>
              )}
            </div>

            {/* Batch timeline */}
            {batches.length > 0 && (
              <div className="glass-card" style={{ padding: '1rem', overflowY: 'auto', maxHeight: '500px' }}>
                <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Chi tiết ({batches.length} đoạn)
                </h4>
                {batches.map((batch, i) => {
                  const speeds = batch.positions.map(p => p.speed).filter(Boolean)
                  const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0
                  return (
                    <div key={batch.id} className="timeline-item">
                      <div className="timeline-dot" style={{
                        background: i === 0 ? '#10b981' : i === batches.length - 1 ? '#ef4444' : '#3b82f6'
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                          {new Date(batch.recorded_at).toLocaleTimeString('vi-VN')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {batch.positions?.length || 0} điểm
                          {avgSpeed > 0 && ` • TB ${Math.round(avgSpeed)} km/h`}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {!searched && (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Calendar size={64} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p style={{ fontSize: '1rem', fontWeight: 500 }}>Chọn phương tiện và khoảng thời gian để xem lịch sử hành trình</p>
          </div>
        )}
      </main>
    </div>
  )
}

function estimateDistance(batches: HistoryBatch[]): number {
  let total = 0
  const toRad = (d: number) => d * Math.PI / 180
  for (const batch of batches) {
    for (let i = 1; i < (batch.positions?.length || 0); i++) {
      const a = batch.positions[i - 1]
      const b = batch.positions[i]
      const R = 6371
      const dLat = toRad(b.lat - a.lat)
      const dLon = toRad(b.lng - a.lng)
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
      total += R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
    }
  }
  return total
}
