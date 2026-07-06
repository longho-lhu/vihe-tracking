'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import StatusBadge from '@/components/StatusBadge'
import UpdateDeviceModal from '@/components/UpdateDeviceModal'
import { Search, Plus, Trash2, Eye, Settings, RefreshCw, Filter } from 'lucide-react'
import Link from 'next/link'

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
  mqtt_topic: string
  owner?: { id: string; username: string; display_name: string }
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [filtered, setFiltered] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updateDevice, setUpdateDevice] = useState<Device | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Device | null>(null)

  const fetchDevices = useCallback(async () => {
    const res = await fetch('/api/devices')
    if (res.ok) {
      const data = await res.json()
      setDevices(data)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDevices()
    const interval = setInterval(fetchDevices, 15000)
    return () => clearInterval(interval)
  }, [fetchDevices])

  useEffect(() => {
    let result = devices
    if (statusFilter !== 'all') result = result.filter(d => d.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(d =>
        d.license_plate?.toLowerCase().includes(q) ||
        d.mac_address.toLowerCase().includes(q) ||
        d.vehicle_type?.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [devices, search, statusFilter])

  async function handleDelete(device: Device) {
    const res = await fetch(`/api/devices/${device.id}`, { method: 'DELETE' })
    if (res.ok) {
      setDevices(prev => prev.filter(d => d.id !== device.id))
      setDeleteConfirm(null)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Quản lý thiết bị</h1>
            <p className="page-subtitle">{devices.length} thiết bị đã đăng ký</p>
          </div>
          <button className="btn-secondary" onClick={fetchDevices} id="refresh-devices-btn">
            <RefreshCw size={16} />
            Làm mới
          </button>
        </div>

        {/* Filters */}
        <div className="glass-card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              id="device-search"
              className="input-field"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Tìm biển số, MAC..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} color="var(--text-muted)" />
            {['all', 'moving', 'waiting', 'sleeping', 'offline'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '0.375rem 0.75rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.8125rem', fontFamily: 'inherit',
                  border: statusFilter === s ? '1px solid rgba(59,130,246,0.5)' : '1px solid var(--border)',
                  background: statusFilter === s ? 'rgba(59,130,246,0.15)' : 'var(--bg-secondary)',
                  color: statusFilter === s ? '#93c5fd' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                }}
              >
                {s === 'all' ? 'Tất cả' : s === 'moving' ? 'Di chuyển' : s === 'waiting' ? 'Chờ' : s === 'sleeping' ? 'Ngủ' : 'Offline'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <p>Không tìm thấy thiết bị nào</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Biển số / MAC</th>
                    <th>Loại xe</th>
                    <th>Trạng thái</th>
                    <th>Tốc độ</th>
                    <th>Topic MQTT</th>
                    <th>Cập nhật cuối</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(device => (
                    <tr key={device.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: device.is_configured ? 'var(--text-primary)' : '#fbbf24' }}>
                          {device.license_plate || '⚠ Chưa cấu hình'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {device.mac_address}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{device.vehicle_type || '—'}</td>
                      <td><StatusBadge status={device.status} /></td>
                      <td style={{ color: device.last_speed && device.last_speed > 0 ? '#34d399' : 'var(--text-muted)', fontWeight: 600 }}>
                        {device.last_speed ? `${Math.round(device.last_speed)} km/h` : '—'}
                      </td>
                      <td>
                        <code style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '0.2rem 0.375rem', borderRadius: 4 }}>
                          {device.mqtt_topic}
                        </code>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        {device.last_seen ? new Date(device.last_seen).toLocaleString('vi-VN') : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Link
                            href={`/devices/${device.id}`}
                            className="btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            title="Xem chi tiết"
                          >
                            <Eye size={14} />
                          </Link>
                          <button
                            onClick={() => setUpdateDevice(device)}
                            className="btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            title="Cập nhật thông tin"
                          >
                            <Settings size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(device)}
                            className="btn-danger"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '8px' }}
                            title="Xóa thiết bị"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Update modal */}
      {updateDevice && (
        <UpdateDeviceModal
          device={updateDevice}
          onClose={() => setUpdateDevice(null)}
          onSave={(updated) => {
            setDevices(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d))
            setUpdateDevice(null)
          }}
        />
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>Xác nhận xóa thiết bị</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Bạn chắc chắn muốn xóa thiết bị <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm.license_plate || deleteConfirm.mac_address}</strong>?
              Hành động này không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)} style={{ flex: 1 }}>Hủy</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, justifyContent: 'center' }}>
                <Trash2 size={16} /> Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
