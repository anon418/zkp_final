'use client'

import React from 'react'

interface VoteResult {
  id: string
  label: string
  votes: number
}

interface VoteResultsProps {
  voteResults: VoteResult[] | null
  participantCount: number
  isPollEnded: boolean
  onClose?: () => void
}

export default function VoteResults({
  voteResults,
  participantCount,
  isPollEnded,
  onClose,
}: VoteResultsProps) {
  return (
    <div
      style={{
        marginTop: '30px',
        padding: '24px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          gap: '16px',
        }}
      >
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#fff',
            margin: 0,
            flex: 1,
          }}
        >
          📊 투표 결과
        </h2>
        {!isPollEnded && onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
            }}
          >
            닫기
          </button>
        )}
      </div>

      {voteResults && voteResults.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {voteResults
            .sort((a, b) => b.votes - a.votes)
            .map((result, idx) => {
              const percentage =
                participantCount > 0
                  ? ((result.votes / participantCount) * 100).toFixed(1)
                  : '0'
              return (
                <div
                  key={result.id}
                  style={{
                    padding: '16px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    border:
                      idx === 0
                        ? '2px solid #22c55e'
                        : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                      gap: '16px', // 후보명과 표수 사이 간격 추가
                    }}
                  >
                    <span
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        color: '#fff',
                        flex: 1, // 남은 공간 차지
                      }}
                    >
                      {idx === 0 && result.votes > 0 ? '🏆 ' : ''}
                      {result.label}
                    </span>
                    <span
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: idx === 0 ? '#22c55e' : '#94a3b8',
                        whiteSpace: 'nowrap', // 줄바꿈 방지
                        marginLeft: 'auto', // 오른쪽 정렬
                      }}
                    >
                      {result.votes}표 ({percentage}%)
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background:
                          idx === 0
                            ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                            : 'linear-gradient(90deg, #3b82f6, #2563eb)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          <p
            style={{
              textAlign: 'center',
              fontSize: '0.9rem',
              color: 'rgba(255,255,255,0.7)',
              marginTop: '16px',
            }}
          >
            총 {participantCount}명 참여
          </p>
          {!isPollEnded && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              <p style={{ margin: '0 0 4px 0', fontWeight: 600 }}>
                💡 재투표 정책 안내
              </p>
              <p style={{ margin: 0, fontSize: '0.8rem' }}>
                • 마감 시간 전까지 재투표 가능
                <br />
                • <strong>마지막 투표만 집계</strong>되며, 이전 투표는 자동으로 무효화됩니다
                <br />
                • 재투표 시 총 투표 수는 증가하지 않습니다
              </p>
            </div>
          )}
        </div>
      ) : voteResults === null ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
            결과를 불러오는 중...
          </p>
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          <p style={{ fontSize: '0.9rem' }}>아직 투표가 없습니다</p>
        </div>
      )}
    </div>
  )
}

