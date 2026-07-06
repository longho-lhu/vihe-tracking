'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import StatusBadge from '@/components/StatusBadge'
import UpdateDeviceModal from '@/components/UpdateDeviceModal'
import dynamic from 'next/dynamic'
import {
  Cpu, Activity, Moon, WifiOff, Bell, MapPin,
  TrendingUp, RefreshCw, ChevronRight,
} from 'lucide-react'
import Link from 'next/link'

const LiveMap = dynamic(() => import('@/components/LiveMap'), { ssr: false })

interface Device {
  id: string
  mac_address: string
  license_plate?: string
  vehicle_type?: string
  status: 'moving' | 'waiting' | 'sleeping' | 'offline'
  last_lat?: number
  last_lng?: number
  last_speed?: number
  last_seen?: string
  is_configured: boolean
}

interface Notification {
  id: string
  type: string
  message: string
  is_read: boolean
  created_at: string
  device?: { id: string; mac_address: string; license_plate?: string }
}

export default function DashboardPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [updateDevice, setUpdateDevice] = useState<Device | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const [devRes, notifRes] = await Promise.all([
      fetch('/api/devices'),
      fetch('/api/notifications?limit=10'),
    ])
    if (devRes.ok) setDevices(await devRes.json())
    if (notifRes.ok) setNotifications(await notifRes.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  const stats = {
    total: devices.length,
    moving: devices.filter(d => d.status === 'moving').length,
    waiting: devices.filter(d => d.status === 'waiting').length,
    sleeping: devices.filter(d => d.status === 'sleeping').length,
    offline: devices.filter(d => d.status === 'offline').length,
    unconfigured: devices.filter(d => !d.is_configured).length,
  }

  const recentMoving = devices.filter(d => d.status === 'moving').slice(0, 5)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Tổng quan hệ thống theo dõi phương tiện</p>
          </div>
          <button className="btn-secondary" onClick={fetchData} id="refresh-btn">
            <RefreshCw size={16} />
            Làm mới
          </button>
        </div>

        {/* Stats row */}
        <div
          className="stat-grid-mobile"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}
        >
          <StatCard icon={<Cpu size={22} color="#60a5fa" />} label="Tổng thiết bị" value={stats.total} color="#3b82f6" />
          <StatCard icon={<Activity size={22} color="#34d399" />} label="Đang di chuyển" value={stats.moving} color="#10b981" />
          <StatCard icon={<TrendingUp size={22} color="#fbbf24" />} label="Đang chờ" value={stats.waiting} color="#f59e0b" />
          <StatCard icon={<Moon size={22} color="#a5b4fc" />} label="Đang ngủ" value={stats.sleeping} color="#8b5cf6" />
          <StatCard icon={<WifiOff size={22} color="#9ca3af" />} label="Offline" value={stats.offline} color="#6b7280" />
          {stats.unconfigured > 0 && (
            <StatCard icon={<Bell size={22} color="#fca5a5" />} label="Chưa cấu hình" value={stats.unconfigured} color="#ef4444" />
          )}
        </div>

        {/* Main grid */}
        <div className="dashboard-main-grid">
          {/* Live map */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', minHeight: '500px' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={18} color="#60a5fa" />
                <span style={{ fontWeight: 600 }}>
                  {selectedDevice ? `Theo dõi: ${selectedDevice.license_plate || selectedDevice.mac_address}` : 'Chọn thiết bị để xem vị trí'}
                </span>
              </div>
              {selectedDevice && (
                <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }} onClick={() => setSelectedDevice(null)}>
                  Hủy chọn
                </button>
              )}
            </div>
            <div style={{ height: '460px' }} className="dashboard-map-height">
              {selectedDevice && selectedDevice.last_lat ? (
                <LiveMap
                  deviceId={selectedDevice.id}
                  initialPosition={{ lat: selectedDevice.last_lat!, lng: selectedDevice.last_lng! }}
                  deviceLabel={selectedDevice.license_plate || selectedDevice.mac_address}
                />
              ) : (
                <div style={{
                  height: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)', gap: '0.75rem',
                }}>
                  <MapPin size={48} style={{ opacity: 0.3 }} />
                  <p style={{ fontSize: '0.875rem' }}>Chọn thiết bị từ danh sách bên phải</p>
                </div>
              )}
            </div>
          </div>

          {/* Right panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Active devices */}
            <div className="glass-card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Đang di chuyển ({recentMoving.length})
                </h3>
                <Link href="/devices" style={{ fontSize: '0.75rem', color: '#60a5fa', textDecoration: 'none' }}>Xem tất cả</Link>
              </div>
              {recentMoving.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', padding: '1rem 0' }}>
                  Không có phương tiện đang di chuyển
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {recentMoving.map(device => (
                    <button
                      key={device.id}
                      onClick={() => setSelectedDevice(device)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.625rem 0.75rem', borderRadius: 10, cursor: 'pointer',
                        background: selectedDevice?.id === device.id ? 'rgba(59,130,246,0.15)' : 'var(--bg-secondary)',
                        border: `1px solid ${selectedDevice?.id === device.id ? 'rgba(59,130,246,0.4)' : 'transparent'}`,
                        transition: 'all 0.2s', textAlign: 'left', width: '100%', fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {device.license_plate || device.mac_address}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {device.vehicle_type || 'Chưa cấu hình'} • {Math.round(device.last_speed || 0)} km/h
                        </div>
                      </div>
                      <ChevronRight size={14} color="var(--text-muted)" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="glass-card" style={{ padding: '1rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Thông báo gần đây
                </h3>
                <Link href="/notifications" style={{ fontSize: '0.75rem', color: '#60a5fa', textDecoration: 'none' }}>Xem tất cả</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto' }}>
                {notifications.slice(0, 8).map(notif => (
                  <NotifItem
                    key={notif.id}
                    notif={notif}
                    onConfigure={() => {
                      const dev = devices.find(d => d.id === notif.device?.id)
                      if (dev) setUpdateDevice(dev)
                    }}
                  />
                ))}
                {notifications.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', padding: '1rem 0' }}>
                    Không có thông báo
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* All devices quick table */}
        <div className="glass-card" style={{ marginTop: '1.5rem', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600 }}>Tất cả thiết bị</h3>
            <Link href="/devices" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>
              Quản lý thiết bị
            </Link>
          </div>
          <div className="dashboard-table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Biển số / MAC</th>
                  <th className="hide-mobile">Loại xe</th>
                  <th>Trạng thái</th>
                  <th className="hide-mobile">Tốc độ</th>
                  <th className="hide-mobile">Cập nhật cuối</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {devices.slice(0, 10).map(device => (
                  <tr key={device.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{device.license_plate || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{device.mac_address}</div>
                    </td>
                    <td className="hide-mobile" style={{ color: 'var(--text-secondary)' }}>{device.vehicle_type || '—'}</td>
                    <td><StatusBadge status={device.status} /></td>
                    <td className="hide-mobile" style={{ color: '#60a5fa', fontWeight: 500 }}>
                      {device.last_speed ? `${Math.round(device.last_speed)} km/h` : '—'}
                    </td>
                    <td className="hide-mobile" style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {device.last_seen ? new Date(device.last_seen).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td>
                      <Link href={`/devices/${device.id}`} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}>
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>{/* dashboard-table-wrap */}
        </div>
      </main>

      {/* Update modal */}
      {updateDevice && (
        <UpdateDeviceModal
          device={updateDevice}
          onClose={() => setUpdateDevice(null)}
          onSave={() => { setUpdateDevice(null); fetchData() }}
        />
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.375rem' }}>{label}</div>
    </div>
  )
}

function NotifItem({ notif, onConfigure }: { notif: Notification; onConfigure: () => void }) {
  return (
    <div style={{
      padding: '0.625rem 0.75rem', borderRadius: 8,
      background: notif.is_read ? 'transparent' : 'rgba(59,130,246,0.07)',
      border: `1px solid ${notif.is_read ? 'transparent' : 'rgba(59,130,246,0.15)'}`,
    }}>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>{notif.message}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.375rem' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {new Date(notif.created_at).toLocaleString('vi-VN')}
        </span>
        {notif.type === 'new_device' && !notif.is_read && (
          <button onClick={onConfigure} style={{
            fontSize: '0.7rem', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
          }}>
            Cấu hình →
          </button>
        )}
      </div>
    </div>
  )
}
