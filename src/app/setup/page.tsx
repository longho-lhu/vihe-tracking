'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Radio, ShieldCheck } from 'lucide-react'

export default function SetupPage() {
  const router = useRouter()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch('/api/auth/setup').then(r => r.json()).then(data => {
      if (!data.needsSetup) router.replace('/')
      else setChecking(false)
    })
  }, [router])

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp')
      return
    }
    if (password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName: displayName || username }),
      })
      if (res.ok) {
        router.push('/')
      } else {
        const data = await res.json()
        setError(data.error || 'Lỗi khởi tạo')
      }
    } catch {
      setError('Lỗi kết nối. Thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px', padding: '2rem',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '24px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '18px', margin: '0 auto 1rem',
            background: 'linear-gradient(135deg, #059669, #2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
          }}>
            <ShieldCheck size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }} className="gradient-text">Thiết lập hệ thống</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.375rem' }}>
            Tạo tài khoản admin đầu tiên
          </p>
        </div>

        <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="input-label">Tên hiển thị</label>
            <input className="input-field" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Quản trị viên" />
          </div>
          <div>
            <label className="input-label">Tên đăng nhập *</label>
            <input className="input-field" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" required />
          </div>
          <div>
            <label className="input-label">Mật khẩu *</label>
            <input className="input-field" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" required />
          </div>
          <div>
            <label className="input-label">Xác nhận mật khẩu *</label>
            <input className="input-field" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu" required />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.625rem', color: '#fca5a5', fontSize: '0.8125rem' }}>
              {error}
            </div>
          )}

          <button id="setup-btn" type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', padding: '0.75rem' }}>
            {loading ? <span className="spinner" /> : <Radio size={16} />}
            {loading ? 'Đang tạo...' : 'Khởi tạo hệ thống'}
          </button>
        </form>
      </div>
    </div>
  )
}
