'use client'

import { useState } from 'react'
import { X, Save, Truck, Car, Bike } from 'lucide-react'

interface Device {
  id: string
  mac_address: string
  license_plate?: string
  vehicle_type?: string
  owner_id?: string
}

interface UpdateDeviceModalProps {
  device: Device
  onClose: () => void
  onSave: (updated: Device) => void
}

const VEHICLE_TYPES = [
  { value: 'Xe máy', icon: <Bike size={16} /> },
  { value: 'Ô tô', icon: <Car size={16} /> },
  { value: 'Xe tải', icon: <Truck size={16} /> },
  { value: 'Xe buýt', icon: <Truck size={16} /> },
  { value: 'Xe đạp điện', icon: <Bike size={16} /> },
]

export default function UpdateDeviceModal({ device, onClose, onSave }: UpdateDeviceModalProps) {
  const [licensePlate, setLicensePlate] = useState(device.license_plate || '')
  const [vehicleType, setVehicleType] = useState(device.vehicle_type || 'Xe máy')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!licensePlate.trim()) {
      setError('Vui lòng nhập biển số xe')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/devices/${device.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_plate: licensePlate.trim().toUpperCase(),
          vehicle_type: vehicleType,
        }),
      })
      if (!res.ok) throw new Error('Failed to update')
      const updated = await res.json()
      onSave(updated)
      onClose()
    } catch {
      setError('Không thể cập nhật thông tin. Thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Cập nhật thông tin phương tiện
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              MAC: {device.mac_address}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* License plate */}
          <div>
            <label className="input-label">Biển số xe *</label>
            <input
              id="license-plate-input"
              className="input-field"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              placeholder="Ví dụ: 51A-12345"
              maxLength={12}
            />
          </div>

          {/* Vehicle type */}
          <div>
            <label className="input-label">Loại phương tiện</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
              {VEHICLE_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setVehicleType(type.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.5rem 0.875rem', borderRadius: '8px', cursor: 'pointer',
                    border: vehicleType === type.value
                      ? '1px solid rgba(59,130,246,0.6)'
                      : '1px solid var(--border)',
                    background: vehicleType === type.value
                      ? 'rgba(59,130,246,0.15)'
                      : 'var(--bg-secondary)',
                    color: vehicleType === type.value ? '#93c5fd' : 'var(--text-secondary)',
                    fontSize: '0.8125rem', fontWeight: 500, fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                >
                  {type.icon}
                  {type.value}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p style={{ color: '#fca5a5', fontSize: '0.8125rem', background: 'rgba(239,68,68,0.1)', padding: '0.625rem', borderRadius: '8px' }}>
              {error}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Hủy
            </button>
            <button
              id="save-device-btn"
              className="btn-primary"
              onClick={handleSave}
              disabled={loading}
              style={{ flex: 2 }}
            >
              {loading ? <span className="spinner" /> : <Save size={16} />}
              {loading ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
