'use client'

import { useEffect, useState, useCallback } from 'react'
import { requestNotificationPermission, onForegroundMessage } from '@/lib/firebase-client'
import { Bell, X, CheckCircle, Smartphone } from 'lucide-react'
import Link from 'next/link'

interface ToastNotification {
  id: string
  title: string
  body: string
  deviceId?: string
}

type PromptState = 'hidden' | 'asking' | 'ios-hint' | 'no-sw'

export default function WebPushNotification() {
  const [promptState, setPromptState] = useState<PromptState>('hidden')
  const [loading, setLoading] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [toast, setToast] = useState<ToastNotification | null>(null)

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || ''
  const isFirebaseConfigured =
    !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    !process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes('your-')

  const setupForegroundListener = useCallback(() => {
    return onForegroundMessage((payload) => {
      const title = payload.notification?.title || 'VehiTrack'
      const body = payload.notification?.body || ''
      const deviceId = payload.data?.device_id
      setToast({ id: Date.now().toString(), title, body, deviceId })
      setTimeout(() => setToast(null), 6000)
    })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !isFirebaseConfigured) return

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const hasServiceWorker = 'serviceWorker' in navigator
    const hasNotifications = 'Notification' in window
    const savedToken = localStorage.getItem('fcm_token')
    const isFirstVisit = !localStorage.getItem('push_prompt_shown')

    // Already enabled on this device
    if (savedToken && Notification.permission === 'granted') {
      setEnabled(true)
      setupForegroundListener()
      return
    }

    // iOS without standalone mode — can't use push
    if (isIOS && !('standalone' in navigator && (navigator as { standalone?: boolean }).standalone)) {
      if (isFirstVisit) {
        localStorage.setItem('push_prompt_shown', '1')
        // Only show iOS hint once, after a delay
        setTimeout(() => setPromptState('ios-hint'), 2000)
      }
      return
    }

    // Browser without service worker support
    if (!hasServiceWorker) {
      if (isFirstVisit) {
        localStorage.setItem('push_prompt_shown', '1')
        setTimeout(() => setPromptState('no-sw'), 2000)
      }
      return
    }

    // Normal browsers — show permission prompt on first visit
    if (hasNotifications && Notification.permission === 'default' && isFirstVisit) {
      localStorage.setItem('push_prompt_shown', '1')
      setTimeout(() => setPromptState('asking'), 1500)
    }
  }, [isFirebaseConfigured, setupForegroundListener])

  async function handleEnable() {
    setLoading(true)
    setPromptState('hidden')

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
        setEnabled(true)
        setupForegroundListener()
      }
    }
    setLoading(false)
  }

  async function handleDisable() {
    const token = localStorage.getItem('fcm_token')
    if (token) {
      await fetch('/api/fcm/register', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      localStorage.removeItem('fcm_token')
    }
    setEnabled(false)
    setPromptState('hidden')
  }

  if (!isFirebaseConfigured) return null

  return (
    <>
      {/* === Permission prompt (normal browser) === */}
      {promptState === 'asking' && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '1.25rem', width: 300,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 1000,
          animation: 'slideUp 0.3s ease',
        }}>
          <button onClick={() => setPromptState('hidden')} style={{
            position: 'absolute', top: 10, right: 10,
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
          }}>
            <X size={16} />
          </button>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bell size={20} color="#60a5fa" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.125rem' }}>Bật thông báo push</p>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Nhận cảnh báo tức thì khi thiết bị thay đổi trạng thái
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" onClick={() => setPromptState('hidden')}
              style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem' }}>
              Để sau
            </button>
            <button id="enable-push-btn" className="btn-primary" onClick={handleEnable} disabled={loading}
              style={{ flex: 2, justifyContent: 'center', fontSize: '0.8rem' }}>
              {loading ? <span className="spinner" /> : <Bell size={14} />}
              {loading ? 'Đang bật...' : 'Bật ngay'}
            </button>
          </div>
        </div>
      )}

      {/* === iOS hint (cần Add to Home Screen) === */}
      {promptState === 'ios-hint' && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '1rem 1.25rem', width: 'min(340px, 90vw)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 1000,
          animation: 'slideUp 0.3s ease',
        }}>
          <button onClick={() => setPromptState('hidden')} style={{
            position: 'absolute', top: 10, right: 10,
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
          }}>
            <X size={16} />
          </button>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <Smartphone size={22} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.375rem' }}>
                Thêm vào màn hình chính để nhận thông báo
              </p>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Safari iOS: Nhấn nút <strong style={{ color: '#60a5fa' }}>Chia sẻ ↑</strong> → <strong style={{ color: '#60a5fa' }}>Thêm vào màn hình chính</strong>, rồi mở app từ màn hình chính để bật thông báo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* === No service worker support === */}
      {promptState === 'no-sw' && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem',
          background: 'var(--bg-card)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 16, padding: '1rem 1.25rem', width: 280,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 1000,
          animation: 'slideUp 0.3s ease',
        }}>
          <button onClick={() => setPromptState('hidden')} style={{
            position: 'absolute', top: 10, right: 10,
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
          }}>
            <X size={16} />
          </button>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fbbf24', marginBottom: '0.375rem' }}>
            ⚠ Trình duyệt không hỗ trợ push
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Hãy dùng <strong>Chrome</strong> hoặc <strong>Edge</strong> để nhận thông báo đẩy. Safari iOS cần thêm vào màn hình chính trước.
          </p>
        </div>
      )}

      {/* === Toggle button (FAB) khi đã enabled === */}
      {enabled && (
        <button
          id="push-toggle-btn"
          onClick={handleDisable}
          title="Tắt thông báo push"
          style={{
            position: 'fixed',
            bottom: 'calc(72px + env(safe-area-inset-bottom, 0px) + 0.75rem)',
            right: '1rem',
            zIndex: 490,
            width: 40, height: 40, borderRadius: '50%', cursor: 'pointer',
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(16,185,129,0.25)', transition: 'all 0.2s',
          }}
        >
          <Bell size={18} color="#34d399" />
        </button>
      )}

      {/* === In-app toast khi tab đang mở === */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: enabled ? '5rem' : '1.5rem', right: '1.5rem',
          background: 'var(--bg-card)', border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 14, padding: '1rem 1.25rem', width: 300,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 1001,
          animation: 'slideUp 0.3s ease', borderLeft: '3px solid #3b82f6',
        }}>
          <button onClick={() => setToast(null)} style={{
            position: 'absolute', top: 8, right: 8,
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
          }}>
            <X size={14} />
          </button>
          <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
            <CheckCircle size={18} color="#3b82f6" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, paddingRight: '1.25rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{toast.title}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{toast.body}</p>
              {toast.deviceId && (
                <Link href={`/devices/${toast.deviceId}`}
                  style={{ fontSize: '0.75rem', color: '#60a5fa', textDecoration: 'none', marginTop: '0.375rem', display: 'inline-block' }}
                  onClick={() => setToast(null)}>
                  Xem chi tiết →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
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
