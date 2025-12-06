'use client'

import React from 'react'

interface PollInfoProps {
  title: string
  description: string
}

export default function PollInfo({ title, description }: PollInfoProps) {
  return (
    <>
      <h1 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800 }}>
        {title}
      </h1>
      <p style={{ textAlign: 'center', opacity: 0.8 }}>{description}</p>

      {/* ZKP 투표의 메리트 설명 */}
      <div
        style={{
          marginTop: 20,
          padding: '16px',
          background: 'rgba(59, 130, 246, 0.1)',
          borderLeft: '4px solid #3b82f6',
          borderRadius: '8px',
        }}
      >
        <h3
          style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: '#1e40af',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          🔒 Zero-Knowledge Proof 기반 완전 익명 투표
        </h3>
        <ul
          style={{
            fontSize: '0.85rem',
            color: '#1e3a8a',
            margin: 0,
            paddingLeft: '20px',
            lineHeight: '1.6',
          }}
        >
          <li>
            <strong>완전한 익명성:</strong> 투표 내용은 누구도 알 수 없습니다
          </li>
          <li>
            <strong>투명한 검증:</strong> 블록체인에서 누구나 재검증 가능합니다
          </li>
          <li>
            <strong>중복 방지:</strong> 1인 1표가 수학적으로 보장됩니다
          </li>
          <li>
            <strong>조작 불가:</strong> 운영자도 투표 결과를 조작할 수 없습니다
          </li>
        </ul>
      </div>
    </>
  )
}

