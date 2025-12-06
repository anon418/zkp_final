'use client'
import React from 'react'

export type VoteStatus =
  | 'idle'
  | 'generating_proof'
  | 'submitting'
  | 'validating'
  | 'confirmed'
  | 'duplicate'
  | 'failed'

interface StatusBadgeProps {
  status: VoteStatus
}

const baseStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '8px 14px',
  borderRadius: '18px',
  fontWeight: 700,
  fontSize: '14px',
  border: '1px solid',
  minWidth: '120px',
  textAlign: 'center',
  transition: 'all .25s ease',
}

/* 상태 텍스트 / 스타일 사전 */
const statusConfig: {
  [key in VoteStatus]: { text: string; style: React.CSSProperties }
} = {
  idle: {
    text: '대기 중',
    style: {
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderColor: 'rgba(255,255,255,0.2)',
      color: '#BDBDBD',
    },
  },
  generating_proof: {
    text: '증명 생성 중…',
    style: {
      backgroundColor: '#BBDEFB',
      borderColor: '#1976D2',
      color: '#1976D2',
      animation: 'pulse 1.4s infinite',
    },
  },
  submitting: {
    text: '제출 중…',
    style: {
      backgroundColor: '#BBDEFB',
      borderColor: '#1976D2',
      color: '#1976D2',
      animation: 'pulse 1.4s infinite',
    },
  },
  validating: {
    text: '검증 중',
    style: {
      backgroundColor: '#FFF9C4',
      borderColor: '#FBC02D',
      color: '#FBC02D',
      animation: 'pulse 1.4s infinite',
    },
  },
  confirmed: {
    text: '영수증 생성 완료',
    style: {
      backgroundColor: '#C8E6C9',
      borderColor: '#4CAF50',
      color: '#4CAF50',
    },
  },
  duplicate: {
    text: '중복 투표 (409)',
    style: {
      backgroundColor: '#FFCDD2',
      borderColor: '#D32F2F',
      color: '#D32F2F',
    },
  },
  failed: {
    text: '실패',
    style: {
      backgroundColor: '#FFCDD2',
      borderColor: '#D32F2F',
      color: '#D32F2F',
    },
  },
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status] || statusConfig.idle
  return (
    <>
      {/* pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>

      <div style={{ ...baseStyle, ...config.style }}>{config.text}</div>
    </>
  )
}

export default StatusBadge
