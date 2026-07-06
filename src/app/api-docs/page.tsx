'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { FileCode2, ExternalLink } from 'lucide-react'

export default function ApiDocsPage() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileCode2 size={24} color="#60a5fa" />
            <div>
              <h1 className="page-title">API Documentation</h1>
              <p className="page-subtitle">Swagger UI - Tài liệu API cho ứng dụng mobile</p>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <FileCode2 size={64} color="#3b82f6" style={{ margin: '0 auto 1.5rem', opacity: 0.8 }} />

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Xem tài liệu API
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Swagger UI được mở trong tab mới để đảm bảo hiển thị tốt nhất
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ fontSize: '0.9375rem', padding: '0.75rem 1.5rem' }}
              id="open-swagger-btn"
            >
              <ExternalLink size={18} />
              Mở Swagger UI
            </a>
            <a
              href="/api/swagger.json"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ fontSize: '0.9375rem', padding: '0.75rem 1.5rem' }}
            >
              ⬇ Tải OpenAPI JSON
            </a>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)', maxWidth: '480px', margin: '2rem auto 0' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Endpoint cho Mobile App
            </p>
            <code style={{ fontSize: '0.875rem', color: '#a5b4fc', wordBreak: 'break-all' }}>
              GET /api/swagger.json
            </code>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Import URL này vào Postman hoặc bất kỳ REST client nào
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
