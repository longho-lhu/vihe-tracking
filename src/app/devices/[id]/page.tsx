'use client'

import { useEffect, useState, use } from 'react'
import Sidebar from '@/components/Sidebar'
import StatusBadge from '@/components/StatusBadge'
import UpdateDeviceModal from '@/components/UpdateDeviceModal'
import dynamic from 'next/dynamic'
import { ArrowLeft, Settings, MapPin, Clock, Wifi, Gauge, Navigation, Signal } from 'lucide-react'
import Link from 'next/link'
import { format, subHours } from 'date-fns'
import { formatSpeed } from '@/lib/format'

const LiveMap = dynamic(() => import('@/components/LiveMap'), { ssr: false })
const HistoryMap = dynamic(() => import('@/components/HistoryMap'), { ssr: false })

interface Device {
  id: string
  mac_address: string
  license_plate?: string
  vehicle_type?: string
  status: 'moving' | 'waiting' | 'sleeping' | 'offline'
  last_lat?: number
  last_lng?: number
  last_speed?: number
  last_alt?: number
  last_seen?: string
  device_time?: string
  pos_source?: 'gps' | 'cell' | 'none'
  gps_status?: 'FIX' | 'NO_FIX'
  sim_status?: 'READY' | 'NOT_READY'
  network_status?: 'ATTACHED' | 'NOT_ATTACHED'
  is_configured: boolean
  mqtt_topic: string
}

interface HistoryBatch {
  id: string
  recorded_at: string
  positions: { lat: number; lng: number; speed: number; ts: number }[]
  start_lat?: number
  start_lng?: number
  end_lat?: number
  end_lng?: number
}

export default function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [device, setDevice] = useState<Device | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'live' | 'history'>('live')
  const [historyBatches, setHistoryBatches] = useState<HistoryBatch[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [fromDate, setFromDate] = useState(format(subHours(new Date(), 3), "yyyy-MM-dd'T'HH:mm"))
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [showUpdateModal, setShowUpdateModal] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchDevice() {
      try {
        const res = await fetch(`/api/devices/${id}`)
        if (!res.ok) return
        const d = await res.json()
        if (!cancelled) {
          setDevice(d)
          setLoading(false)
        }
      } catch {}
    }

    fetchDevice()
    // Poll every 3 seconds for live telemetry updates
    const interval = setInterval(fetchDevice, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [id])

  async function loadHistory() {
    setHistoryLoading(true)
    const from = new Date(fromDate).toISOString()
    const to = new Date(toDate).toISOString()
    const res = await fetch(`/api/devices/${id}/history?from=${from}&to=${to}&limit=200`)
    if (res.ok) setHistoryBatches(await res.json())
    setHistoryLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </main>
    </div>
  )

  if (!device) return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main className="main-content">
        <p style={{ color: 'var(--text-muted)' }}>Không tìm thấy thiết bị</p>
      </main>
    </div>
  )

  const totalPoints = historyBatches.reduce((sum, b) => sum + (b.positions?.length || 0), 0)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <Link href="/devices" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none', fontSize: '0.875rem' }}>
              <ArrowLeft size={16} /> Danh sách thiết bị
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h1 className="page-title">{device.license_plate || device.mac_address}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                <StatusBadge status={device.status} />
                {device.vehicle_type && (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{device.vehicle_type}</span>
                )}
              </div>
            </div>
            <button className="btn-secondary" onClick={() => setShowUpdateModal(true)}>
              <Settings size={16} /> Cập nhật thông tin
            </button>
          </div>
        </div>

        {/* Info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '0.875rem', marginBottom: '1.5rem' }}>
          {/* Position */}
          <InfoCard
            icon={<MapPin size={18} color="#60a5fa" />}
            label={`Vị trí (${device.pos_source === 'gps' ? 'GPS' : device.pos_source === 'cell' ? 'Cell' : 'Không có'})`}
            value={device.last_lat ? `${device.last_lat.toFixed(5)}, ${device.last_lng?.toFixed(5)}` : 'Chưa có'}
            sub={device.last_alt ? `Độ cao: ${device.last_alt.toFixed(1)} m` : undefined}
          />
          {/* Speed */}
          <InfoCard
            icon={<Gauge size={18} color="#34d399" />}
            label="Tốc độ"
            value={formatSpeed(device.last_speed)}
          />
          {/* GPS */}
          <InfoCard
            icon={<Navigation size={18} color={device.gps_status === 'FIX' ? '#34d399' : '#9ca3af'} />}
            label="GPS"
            value={device.gps_status === 'FIX' ? 'Có tín hiệu' : 'Mất tín hiệu'}
            valueColor={device.gps_status === 'FIX' ? '#34d399' : '#9ca3af'}
          />
          {/* SIM */}
          <InfoCard
            icon={<Signal size={18} color={device.sim_status === 'READY' ? '#a5b4fc' : '#9ca3af'} />}
            label="SIM / Mạng"
            value={device.sim_status === 'READY' ? 'Sẵn sàng' : 'Không sẵn sàng'}
            sub={device.network_status === 'ATTACHED' ? 'Đã kết nối mạng' : 'Chưa kết nối mạng'}
            valueColor={device.sim_status === 'READY' ? '#a5b4fc' : '#9ca3af'}
          />
          {/* Last seen */}
          <InfoCard
            icon={<Clock size={18} color="#fbbf24" />}
            label="Server nhận lúc"
            value={device.last_seen ? new Date(device.last_seen).toLocaleString('vi-VN') : 'Chưa kết nối'}
            sub={device.device_time ? `Thiết bị: ${new Date(device.device_time).toLocaleString('vi-VN')}` : undefined}
          />
          {/* Topic */}
          <InfoCard icon={<Wifi size={18} color="#64748b" />} label="MQTT Topic" value={device.mqtt_topic} mono />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {(['live', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '0.5rem 1.25rem', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.875rem',
                border: tab === t ? '1px solid rgba(59,130,246,0.5)' : '1px solid var(--border)',
                background: tab === t ? 'rgba(59,130,246,0.15)' : 'var(--bg-card)',
                color: tab === t ? '#93c5fd' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
            >
              {t === 'live' ? '📡 Theo dõi trực tiếp' : '📅 Lịch sử hành trình'}
            </button>
          ))}
        </div>

        {/* Live tab */}
        {tab === 'live' && (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', height: '550px' }}>
            <LiveMap
              deviceId={device.id}
              initialPosition={device.last_lat ? { lat: device.last_lat, lng: device.last_lng! } : undefined}
              deviceLabel={device.license_plate || device.mac_address}
            />
          </div>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Date range picker */}
            <div className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label className="input-label">Từ ngày giờ</label>
                <input type="datetime-local" className="input-field" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ width: 'auto' }} />
              </div>
              <div>
                <label className="input-label">Đến ngày giờ</label>
                <input type="datetime-local" className="input-field" value={toDate} onChange={e => setToDate(e.target.value)} style={{ width: 'auto' }} />
              </div>
              <button className="btn-primary" onClick={loadHistory} disabled={historyLoading} id="load-history-btn">
                {historyLoading ? <span className="spinner" /> : null}
                {historyLoading ? 'Đang tải...' : 'Xem lịch sử'}
              </button>
              {historyBatches.length > 0 && (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                  {historyBatches.length} batch • {totalPoints} điểm vị trí
                </span>
              )}
            </div>

            {historyBatches.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1rem' }}>
                {/* Map */}
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden', height: '450px' }}>
                  <HistoryMap batches={historyBatches} deviceLabel={device.license_plate} />
                </div>

                {/* Timeline */}
                <div className="glass-card" style={{ padding: '1rem', overflowY: 'auto', maxHeight: '450px' }}>
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    Timeline
                  </h4>
                  {historyBatches.map((batch, i) => (
                    <div key={batch.id} className="timeline-item">
                      <div className="timeline-dot" style={{ background: i === 0 ? '#10b981' : i === historyBatches.length - 1 ? '#ef4444' : '#3b82f6' }} />
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                          {new Date(batch.recorded_at).toLocaleTimeString('vi-VN')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {batch.positions?.length || 0} điểm vị trí
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {historyBatches.length === 0 && !historyLoading && (
              <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Clock size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p>Chọn khoảng thời gian và bấm "Xem lịch sử"</p>
              </div>
            )}
          </div>
        )}
      </main>

      {showUpdateModal && (
        <UpdateDeviceModal
          device={device}
          onClose={() => setShowUpdateModal(false)}
          onSave={(updated) => { setDevice(prev => prev ? { ...prev, ...updated } : prev); setShowUpdateModal(false) }}
        />
      )}
    </div>
  )
}

function InfoCard({
  icon, label, value, mono, sub, valueColor
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
  sub?: string
  valueColor?: string
}) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
        {icon}
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{
        fontSize: mono ? '0.8rem' : '0.9375rem',
        fontWeight: 600,
        fontFamily: mono ? 'monospace' : 'inherit',
        wordBreak: 'break-all',
        color: valueColor || 'var(--text-primary)',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
