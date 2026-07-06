'use client'

type StatusType = 'moving' | 'waiting' | 'sleeping' | 'offline'

const STATUS_CONFIG: Record<StatusType, { label: string; className: string; dot: string }> = {
  moving: { label: 'Đang di chuyển', className: 'badge badge-moving', dot: '#10b981' },
  waiting: { label: 'Đang chờ', className: 'badge badge-waiting', dot: '#f59e0b' },
  sleeping: { label: 'Ngủ', className: 'badge badge-sleeping', dot: '#8b5cf6' },
  offline: { label: 'Offline', className: 'badge badge-offline', dot: '#6b7280' },
}

interface StatusBadgeProps {
  status: StatusType
  showDot?: boolean
}

export default function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline
  return (
    <span className={config.className}>
      {showDot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: config.dot, display: 'inline-block',
          ...(status === 'moving' ? { animation: 'pulse-green 2s infinite' } : {})
        }} />
      )}
      {config.label}
    </span>
  )
}
