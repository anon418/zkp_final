'use client'

import React from 'react'

interface PollHeaderProps {
  statusInfo: {
    badge: string
    text: string
    color: string
  }
  participantCount: number
  timeLeft: string | null
}

export default function PollHeader({
  statusInfo,
  participantCount,
  timeLeft,
}: PollHeaderProps) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        {/* 투표 상태 */}
        <div
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.1)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>{statusInfo.badge}</span>
          <span style={{ color: statusInfo.color, fontWeight: 600 }}>
            {statusInfo.text}
          </span>
        </div>

        {/* 참여자 수 */}
        <div
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            background: 'rgba(79,172,254,0.2)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>👥</span>
          <span>{participantCount}명 참여</span>
        </div>

        {/* 마감 카운트다운 */}
        {statusInfo.text === '진행 중' && timeLeft && (
          <div
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              background:
                timeLeft.includes('분') && !timeLeft.includes('시간')
                  ? 'rgba(239,68,68,0.2)' // 1시간 미만이면 빨간색
                  : 'rgba(251,191,36,0.2)',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              animation: timeLeft.includes('초')
                ? 'pulse 1s infinite'
                : 'none',
            }}
          >
            <span>⏰</span>
            <span>{timeLeft}</span>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </>
  )
}

