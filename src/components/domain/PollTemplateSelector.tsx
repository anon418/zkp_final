'use client'

import React from 'react'
import { POLL_TEMPLATES, getTemplate } from '@/lib/pollTemplates'

interface PollTemplateSelectorProps {
  showTemplates: boolean
  onToggle: () => void
  onSelectTemplate: (templateId: string) => void
}

export default function PollTemplateSelector({
  showTemplates,
  onToggle,
  onSelectTemplate,
}: PollTemplateSelectorProps) {
  return (
    <>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <button
          type="button"
          onClick={onToggle}
          style={{
            padding: '10px 20px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            color: '#0f172a',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          {showTemplates ? '닫기 ✖' : '📋 템플릿 사용하기'}
        </button>
      </div>

      {showTemplates && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            marginBottom: '24px',
            padding: '16px',
            background: '#f8fafc',
            borderRadius: '8px',
          }}
        >
          {POLL_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template.id)}
              style={{
                padding: '16px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                color: '#0f172a',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#dbeafe'
                e.currentTarget.style.borderColor = '#2563eb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff'
                e.currentTarget.style.borderColor = '#e2e8f0'
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>
                {template.icon}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                {template.name}
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

