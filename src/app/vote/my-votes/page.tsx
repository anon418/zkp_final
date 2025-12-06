'use client'

import React, { useState, useEffect } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useUiStore } from '@/store/uiStore'
import Link from 'next/link'
import { getApiUrl } from '@/lib/api-utils'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface VoteHistory {
  pollId: string
  title: string
  candidate: string
  txHash?: string
  nullifierHash?: string
  createdAt: string
  confirmedAt?: string
  status?: string
}

export default function MyVotesPage() {
  const { isConnected, address } = useWallet()
  const { notifyError } = useUiStore()
  const [votes, setVotes] = useState<VoteHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [localStorageVotes, setLocalStorageVotes] = useState<
    Array<{
      pollId: string
      nullifier: string
      txHash: string
      candidate: string
      timestamp: string
    }>
  >([])

  // 로컬 스토리지에서 투표 내역 조회
  useEffect(() => {
    if (typeof window === 'undefined') return

    const localVotes: typeof localStorageVotes = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('vote_') && key.endsWith('_nullifier')) {
        const pollId = key.replace('vote_', '').replace('_nullifier', '')
        const nullifier = localStorage.getItem(key) || ''
        const txHash = localStorage.getItem(`vote_${pollId}_txHash`) || ''
        const candidate = localStorage.getItem(`vote_${pollId}_candidate`) || ''
        const timestamp = localStorage.getItem(`vote_${pollId}_timestamp`) || ''

        if (nullifier && txHash) {
          localVotes.push({
            pollId,
            nullifier,
            txHash,
            candidate,
            timestamp,
          })
        }
      }
    }

    setLocalStorageVotes(localVotes)
  }, [])

  // 서버에서 투표 내역 조회
  useEffect(() => {
    async function loadVotes() {
      if (!isConnected || !address) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const url = getApiUrl(`/api/vote/my-votes?address=${address}`)
        const res = await fetch(url)
        const data = await res.json()

        if (data.success && data.votes) {
          setVotes(data.votes)
        } else {
          notifyError('투표 내역을 불러올 수 없습니다.')
        }
      } catch (err: unknown) {
        const errorObj = err as { message?: string }
        notifyError(
          '투표 내역 조회 중 오류가 발생했습니다: ' +
            (errorObj.message || 'Unknown error')
        )
      } finally {
        setLoading(false)
      }
    }

    loadVotes()
  }, [isConnected, address, notifyError])

  if (!isConnected) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: 40,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '16px' }}>🔒</div>
          <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
            지갑을 연결해주세요
          </div>
          <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
            투표 내역을 조회하려면 MetaMask 지갑을 연결해야 합니다.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: 'white',
        padding: '40px 20px',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                marginBottom: '8px',
              }}
            >
              내 투표 내역
            </h1>
            <p
              style={{
                fontSize: '0.9rem',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              지갑 주소: {address?.substring(0, 10)}...
              {address?.substring(address.length - 8)}
            </p>
          </div>
          <Link
            href="/vote"
            style={{
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              textDecoration: 'none',
              color: 'white',
              fontSize: '0.9rem',
            }}
          >
            ← 투표 목록
          </Link>
        </div>

        {/* 로컬 스토리지 투표 내역 */}
        {localStorageVotes.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2
              style={{
                fontSize: '1.3rem',
                fontWeight: 600,
                marginBottom: '16px',
                color: 'rgba(255,255,255,0.9)',
              }}
            >
              로컬 저장된 투표 내역 ({localStorageVotes.length}개)
            </h2>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {localStorageVotes.map((vote, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '20px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: 'rgba(255,255,255,0.5)',
                          marginBottom: '4px',
                        }}
                      >
                        투표 ID: {vote.pollId.substring(0, 8)}...
                      </div>
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          marginBottom: '8px',
                        }}
                      >
                        후보: {vote.candidate || '알 수 없음'}
                      </div>
                      {vote.timestamp && (
                        <div
                          style={{
                            fontSize: '0.85rem',
                            color: 'rgba(255,255,255,0.7)',
                          }}
                        >
                          {new Date(vote.timestamp).toLocaleString('ko-KR')}
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/vote/${vote.pollId}`}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(34, 197, 94, 0.2)',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        color: '#22c55e',
                        fontSize: '0.85rem',
                      }}
                    >
                      투표 보기
                    </Link>
                  </div>
                  {vote.txHash && (
                    <div
                      style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'rgba(255,255,255,0.5)',
                          marginBottom: '4px',
                        }}
                      >
                        트랜잭션:
                      </div>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${vote.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#00f2fe',
                          textDecoration: 'underline',
                          fontSize: '0.8rem',
                          fontFamily: 'monospace',
                          wordBreak: 'break-all',
                        }}
                      >
                        {vote.txHash}
                      </a>
                    </div>
                  )}
                  {vote.nullifier && (
                    <div
                      style={{
                        marginTop: '8px',
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.5)',
                        fontFamily: 'monospace',
                      }}
                    >
                      Nullifier: {vote.nullifier.substring(0, 20)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 서버 투표 내역 */}
        <div>
          <h2
            style={{
              fontSize: '1.3rem',
              fontWeight: 600,
              marginBottom: '16px',
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            서버 저장된 투표 내역 ({votes.length}개)
          </h2>
          {loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              <LoadingSpinner
                size="medium"
                text="투표 내역을 불러오는 중..."
                color="#4facfe"
              />
            </div>
          ) : votes.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              아직 투표한 내역이 없습니다.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {votes.map((vote) => (
                <div
                  key={vote.pollId + vote.txHash}
                  style={{
                    padding: '20px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          marginBottom: '8px',
                        }}
                      >
                        {vote.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.9rem',
                          color: 'rgba(255,255,255,0.7)',
                          marginBottom: '4px',
                        }}
                      >
                        후보: {vote.candidate}
                      </div>
                      {vote.createdAt && (
                        <div
                          style={{
                            fontSize: '0.85rem',
                            color: 'rgba(255,255,255,0.5)',
                          }}
                        >
                          {new Date(vote.createdAt).toLocaleString('ko-KR')}
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/vote/${vote.pollId}`}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(34, 197, 94, 0.2)',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        color: '#22c55e',
                        fontSize: '0.85rem',
                      }}
                    >
                      투표 보기
                    </Link>
                  </div>
                  {vote.txHash && (
                    <div
                      style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'rgba(255,255,255,0.5)',
                          marginBottom: '4px',
                        }}
                      >
                        트랜잭션:
                      </div>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${vote.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#00f2fe',
                          textDecoration: 'underline',
                          fontSize: '0.8rem',
                          fontFamily: 'monospace',
                          wordBreak: 'break-all',
                        }}
                      >
                        {vote.txHash}
                      </a>
                    </div>
                  )}
                  {vote.nullifierHash && (
                    <div
                      style={{
                        marginTop: '8px',
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.5)',
                        fontFamily: 'monospace',
                      }}
                    >
                      Nullifier: {vote.nullifierHash.substring(0, 20)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
