'use client'

import React from 'react'
import Link from 'next/link'

interface VoteActionButtonsProps {
  pollId: string
  pollData: {
    endTime: string
  } | null
  showResults: boolean
  copySuccess: boolean
  onToggleResults: () => void
  onCopyLink: () => void
}

export default function VoteActionButtons({
  pollId,
  pollData,
  showResults,
  copySuccess,
  onToggleResults,
  onCopyLink,
}: VoteActionButtonsProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '15px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: '30px',
      }}
    >
      {/* 결과 보기 버튼 (진행 중인 투표도 결과 미리보기 가능) */}
      {pollData &&
        pollData.endTime &&
        new Date() <= new Date(pollData.endTime) && (
          <button
            onClick={onToggleResults}
            style={{
              padding: '12px 24px',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '10px',
              color: '#60a5fa',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showResults ? '📊 결과 숨기기' : '📊 결과 보기'}
          </button>
        )}

      <Link
        href={`/qr/${pollId}`}
        style={{
          textDecoration: 'none',
          padding: '12px 24px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '10px',
          color: '#00f2fe',
          fontWeight: 600,
        }}
      >
        📱 QR 코드
      </Link>

      <button
        onClick={onCopyLink}
        style={{
          padding: '12px 24px',
          background: copySuccess
            ? 'rgba(34,197,94,0.2)'
            : 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: '10px',
          color: copySuccess ? '#22c55e' : '#00f2fe',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.3s',
        }}
      >
        {copySuccess ? '✅ 복사됨!' : '🔗 링크 복사'}
      </button>
    </div>
  )
}

