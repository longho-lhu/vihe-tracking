'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Cpu,
  History,
  Bell,
  LogOut,
  Menu,
  X,
  Radio,
  FileCode2,
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/devices', label: 'Thiết bị', icon: <Cpu size={18} /> },
  { href: '/history', label: 'Lịch sử', icon: <History size={18} /> },
  { href: '/notifications', label: 'Thông báo', icon: <Bell size={18} /> },
  { href: '/api-docs', label: 'API Docs', icon: <FileCode2 size={18} /> },
]

// Items shown in bottom nav (only 5 most important, no API Docs on mobile)
const bottomNavItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: <LayoutDashboard size={22} /> },
  { href: '/devices', label: 'Thiết bị', icon: <Cpu size={22} /> },
  { href: '/history', label: 'Lịch sử', icon: <History size={22} /> },
  { href: '/notifications', label: 'Thông báo', icon: <Bell size={22} /> },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  async function fetchUnread() {
    try {
      const res = await fetch('/api/notifications?unread_only=true&limit=50')
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(Array.isArray(data) ? data.length : 0)
      }
    } catch {}
  }

  async function handleLogout() {
    await fetch('/api/auth/me', { method: 'DELETE' })
    router.push('/login')
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ padding: '1.5rem 1rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
          }}>
            <Radio size={18} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>VehiTrack</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Quản lý phương tiện</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-nav-item ${pathname === item.href ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.href === '/notifications' && unreadCount > 0 && (
              <span style={{
                marginLeft: 'auto',
                background: 'var(--accent-red)',
                color: 'white',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.1rem 0.4rem',
                borderRadius: '999px',
                minWidth: '18px',
                textAlign: 'center',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
        <button className="sidebar-nav-item" onClick={handleLogout} style={{ width: '100%', color: '#fca5a5' }}>
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ========== Tablet: hamburger toggle button ========== */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          display: 'none',
          position: 'fixed', top: '1rem', left: '1rem', zIndex: 300,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)',
          alignItems: 'center', justifyContent: 'center',
        }}
        className="mobile-menu-toggle"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* ========== Desktop + Tablet sidebar ========== */}
      <div className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        {sidebarContent}
      </div>

      {/* Tablet backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="mobile-backdrop"
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 199, display: 'none',
          }}
        />
      )}

      {/* ========== Mobile: bottom tab bar ========== */}
      <nav className="bottom-nav" role="navigation" aria-label="Điều hướng chính">
        <div className="bottom-nav-items">
          {bottomNavItems.map((item) => {
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                {item.href === '/notifications' && unreadCount > 0 && (
                  <span className="bottom-nav-badge">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                <span>{item.label}</span>
              </Link>
            )
          })}

          {/* Logout button */}
          <button
            className="bottom-nav-item logout"
            onClick={handleLogout}
          >
            <LogOut size={22} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </nav>
    </>
  )
}
