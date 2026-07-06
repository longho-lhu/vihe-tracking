'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import { Bell, BellOff, CheckCheck, Send, Wifi, ExternalLink, RefreshCw } from 'lucide-react'
import { requestNotificationPermission } from '@/lib/firebase-client'

interface Notification {
  id: string
  type: string
  message: string
  is_read: boolean
  created_at: string
  device?: { id: string; mac_address: string; license_plate?: string }
}

const TYPE_COLORS: Record<string, string> = {
  new_device: '#3b82f6',
  status_change: '#f59e0b',
  offline_alert: '#ef4444',
  info: '#8b5cf6',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [tokenCount, setTokenCount] = useState<number | null>(null)

  // Push notification state
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushHint, setPushHint] = useState<string | null>(null)

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || ''
  const isFirebaseConfigured =
    !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    !process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes('your-')

  const fetchNotifications = useCallback(async () => {
    const res = await fetch('/api/notifications?limit=100')
    if (res.ok) setNotifications(await res.json())
    setLoading(false)
  }, [])

  const refreshTokenCount = useCallback(() => {
    fetch('/api/fcm/test').then(r => r.json()).then(d => setTokenCount(d.count ?? 0))
  }, [])

  useEffect(() => {
    fetchNotifications()
    refreshTokenCount()

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission)
      setPushEnabled(
        Notification.permission === 'granted' && !!localStorage.getItem('fcm_token')
      )
    } else if (typeof window !== 'undefined') {
      setPushPermission('unsupported')
    }
  }, [fetchNotifications, refreshTokenCount])

  async function sendTestNotification() {
    setTestLoading(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/fcm/test', { method: 'POST' })
      const data = await res.json()
      setTestResult(res.ok ? `✅ ${data.message}` : `❌ ${data.error}`)
    } catch {
      setTestResult('❌ Lỗi kết nối')
    }
    setTestLoading(false)
    setTimeout(() => setTestResult(null), 8000)
  }

  async function enablePush() {
    setPushLoading(true)
    setPushHint(null)

    if (!isFirebaseConfigured) {
      setPushHint('Firebase chưa được cấu hình. Điền NEXT_PUBLIC_FIREBASE_* vào .env.local')
      setPushLoading(false)
      return
    }

    if (pushPermission === 'denied') {
      // Browser has hard-denied — must guide user to settings
      setPushHint('denied')
      setPushLoading(false)
      return
    }

    const token = await requestNotificationPermission(vapidKey)
    if (token) {
      const res = await fetch('/api/fcm/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          device_label: `${getBrowserName()} - ${getPlatform()}`,
          platform: 'web',
        }),
      })
      if (res.ok) {
        localStorage.setItem('fcm_token', token)
        setPushEnabled(true)
        setPushPermission('granted')
        refreshTokenCount()
        setPushHint('success')
        setTimeout(() => setPushHint(null), 4000)
      }
    } else {
      const newPerm = 'Notification' in window ? Notification.permission : 'denied'
      setPushPermission(newPerm as NotificationPermission)
      if (newPerm === 'denied') setPushHint('denied')
    }
    setPushLoading(false)
  }

  async function disablePush() {
    const token = localStorage.getItem('fcm_token')
    if (token) {
      await fetch('/api/fcm/register', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      localStorage.removeItem('fcm_token')
    }
    localStorage.removeItem('push_prompt_shown')
    setPushEnabled(false)
    refreshTokenCount()
  }

  async function markAllRead() {
    await fetch('/api/notifications/read-all', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 className="page-title">Thông báo</h1>
            <p className="page-subtitle">{unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Đã đọc tất cả'}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Token count */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.375rem 0.75rem', borderRadius: 8, fontSize: '0.8125rem',
              background: (tokenCount ?? 0) > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
              border: `1px solid ${(tokenCount ?? 0) > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.2)'}`,
            }}>
              <Wifi size={14} color={(tokenCount ?? 0) > 0 ? '#34d399' : '#6b7280'} />
              <span style={{ color: (tokenCount ?? 0) > 0 ? '#34d399' : '#6b7280' }}>
                {tokenCount === null ? '...' : `${tokenCount} thiết bị đăng ký push`}
              </span>
            </div>

            {/* Test button */}
            <button id="test-fcm-btn" className="btn-secondary" onClick={sendTestNotification}
              disabled={testLoading || (tokenCount ?? 0) === 0}
              title={(tokenCount ?? 0) === 0 ? 'Chưa có thiết bị nào đăng ký' : 'Gửi thông báo test'}>
              {testLoading ? <span className="spinner" /> : <Send size={14} />}
              Test Push
            </button>

            {unreadCount > 0 && (
              <button className="btn-secondary" onClick={markAllRead} id="mark-all-read-btn">
                <CheckCheck size={16} />
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
        </div>

        {/* Test result */}
        {testResult && (
          <div style={{
            padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '1rem',
            background: testResult.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${testResult.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            fontSize: '0.875rem',
            color: testResult.startsWith('✅') ? '#34d399' : '#fca5a5',
          }}>
            {testResult}
          </div>
        )}

        {/* ====== PUSH NOTIFICATION SETTINGS CARD ====== */}
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            {/* Left: status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: pushEnabled ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {pushEnabled
                  ? <Bell size={20} color="#34d399" />
                  : <BellOff size={20} color="#6b7280" />
                }
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.125rem' }}>
                  Thông báo push trên thiết bị này
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {pushPermission === 'unsupported' && '⚠ Trình duyệt không hỗ trợ'}
                  {pushPermission === 'denied' && '🚫 Đã từ chối — cần bật lại trong cài đặt trình duyệt'}
                  {pushPermission === 'default' && '○ Chưa bật — nhấn nút để cấp quyền'}
                  {pushPermission === 'granted' && pushEnabled && '✅ Đang bật — thiết bị này nhận push'}
                  {pushPermission === 'granted' && !pushEnabled && '○ Đã có quyền nhưng chưa đăng ký token'}
                </p>
              </div>
            </div>

            {/* Right: actions */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {pushEnabled ? (
                <button className="btn-secondary" onClick={disablePush} id="disable-push-btn"
                  style={{ fontSize: '0.8125rem' }}>
                  <BellOff size={14} />
                  Tắt thông báo
                </button>
              ) : (
                <button
                  id="enable-push-btn"
                  className="btn-primary"
                  onClick={enablePush}
                  disabled={pushLoading || pushPermission === 'unsupported'}
                  style={{ fontSize: '0.8125rem' }}
                >
                  {pushLoading ? <span className="spinner" /> : <Bell size={14} />}
                  {pushLoading ? 'Đang bật...' : 'Bật thông báo'}
                </button>
              )}
              <button className="btn-secondary" onClick={refreshTokenCount}
                style={{ padding: '0.375rem 0.5rem' }} title="Làm mới">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Feedback / hints */}
          {pushHint === 'denied' && (
            <div style={{
              marginTop: '1rem', padding: '0.875rem 1rem', borderRadius: 10,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fca5a5', marginBottom: '0.5rem' }}>
                🚫 Trình duyệt đã chặn quyền thông báo
              </p>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.625rem' }}>
                Do trình duyệt đã ghi nhớ lựa chọn &quot;Từ chối&quot;, bạn cần bật lại thủ công:
              </p>
              <ol style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                <li>Nhấn vào <strong style={{ color: '#93c5fd' }}>biểu tượng khóa 🔒</strong> bên trái thanh địa chỉ</li>
                <li>Chọn <strong style={{ color: '#93c5fd' }}>Cài đặt trang</strong> (Site settings)</li>
                <li>Tìm <strong style={{ color: '#93c5fd' }}>Thông báo</strong> → đổi sang <strong style={{ color: '#34d399' }}>Cho phép</strong></li>
                <li>Tải lại trang và bấm <strong style={{ color: '#93c5fd' }}>Bật thông báo</strong> lại</li>
              </ol>
              <a
                href="chrome://settings/content/notifications"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ fontSize: '0.775rem', marginTop: '0.625rem', display: 'inline-flex', padding: '0.375rem 0.75rem' }}
              >
                <ExternalLink size={12} />
                Mở cài đặt Chrome
              </a>
            </div>
          )}

          {pushHint === 'success' && (
            <div style={{
              marginTop: '0.75rem', padding: '0.625rem 1rem', borderRadius: 10,
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
              fontSize: '0.8125rem', color: '#34d399',
            }}>
              ✅ Thông báo push đã được bật trên thiết bị này!
            </div>
          )}
        </div>

        {/* ====== NOTIFICATION LIST ====== */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Bell size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>Không có thông báo</p>
            </div>
          ) : (
            <div>
              {notifications.map((notif, i) => (
                <div key={notif.id} style={{
                  padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start',
                  borderBottom: i < notifications.length - 1 ? '1px solid rgba(99,120,179,0.1)' : 'none',
                  background: notif.is_read ? 'transparent' : 'rgba(59,130,246,0.05)',
                  transition: 'background 0.2s',
                }}>
                  {/* Type dot */}
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: TYPE_COLORS[notif.type] || '#6b7280', marginTop: 5,
                    ...(notif.is_read ? {} : { boxShadow: `0 0 8px ${TYPE_COLORS[notif.type] || '#6b7280'}60` }),
                  }} />

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{notif.message}</p>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.375rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(notif.created_at).toLocaleString('vi-VN')}
                      </span>
                      <span className="chip">{notif.type.replace('_', ' ')}</span>
                      {notif.device?.license_plate && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {notif.device.license_plate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mark read */}
                  {!notif.is_read && (
                    <button onClick={() => markRead(notif.id)} title="Đánh dấu đã đọc"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', borderRadius: 6 }}>
                      <CheckCheck size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function getBrowserName(): string {
  const ua = navigator.userAgent
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Edge')) return 'Edge'
  return 'Browser'
}

function getPlatform(): string {
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return 'Android'
  if (/iphone|ipad/i.test(ua)) return 'iOS'
  if (/mac/i.test(ua)) return 'Mac'
  if (/win/i.test(ua)) return 'Windows'
  return 'Desktop'
}
