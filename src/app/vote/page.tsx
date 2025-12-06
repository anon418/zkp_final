'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import { useUiStore } from '@/store/uiStore'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface Poll {
  pollId: string
  title: string
  description?: string
  startTime: string
  endTime: string
  createdAt: string
  status?: string
}

export default function VoteListPage() {
  const { notify, notifyError } = useUiStore()
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  // 지갑 연결
  useEffect(() => {
    async function connectWallet() {
      try {
        if (!window.ethereum) {
          notifyError('MetaMask를 설치해주세요')
          return
        }
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.send('eth_requestAccounts', [])
        setWalletAddress(accounts[0])
      } catch (err) {
        console.error('지갑 연결 실패:', err)
      }
    }
    connectWallet()
  }, [])

  // 내가 만든 투표 목록 조회
  useEffect(() => {
    async function loadPolls() {
      if (!walletAddress) return

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
        const url = apiUrl
          ? `${apiUrl}/api/vote?creator=${walletAddress}`
          : `/api/vote?creator=${walletAddress}`

        const res = await fetch(url)
        const json = await res.json()

        if (json.success && json.polls) {
          setPolls(json.polls)
        }
      } catch (err) {
        console.error('투표 목록 조회 실패:', err)
        notifyError('투표 목록을 불러올 수 없습니다')
      } finally {
        setLoading(false)
      }
    }
    loadPolls()
  }, [walletAddress])

  // 투표 삭제 (생성자만 가능)
  const handleDelete = async (pollId: string) => {
    if (!walletAddress) {
      notifyError('지갑을 연결해주세요')
      return
    }

    // 확인 메시지
    const confirmed = confirm(
      '⚠️ 정말 이 투표를 삭제하시겠습니까?\n\n' +
        '• 투표와 모든 투표 데이터가 영구적으로 삭제됩니다\n' +
        '• 이 작업은 되돌릴 수 없습니다\n' +
        '• 삭제된 투표는 복구할 수 없습니다'
    )

    if (!confirmed) return

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
      const url = apiUrl
        ? `${apiUrl}/api/vote/${pollId}/delete`
        : `/api/vote/${pollId}/delete`

      // 요청 바디에 creatorWallet 포함 (더 안전)
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorWallet: walletAddress,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        // 권한 오류 특별 처리
        if (json.error === 'FORBIDDEN') {
          notifyError(
            '이 투표를 삭제할 권한이 없습니다. 생성자만 삭제할 수 있습니다.'
          )
        } else {
          throw new Error(json.message || '투표 삭제 실패')
        }
        return
      }

      notify('투표가 삭제되었습니다', 'success')
      // 목록에서 제거
      setPolls(polls.filter((p) => p.pollId !== pollId))
    } catch (err: unknown) {
      const error = err as { message?: string }
      console.error('삭제 실패:', error)
      notifyError(error.message || '투표 삭제 실패')
    }
  }

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: '40px 20px',
  }

  const containerStyle: React.CSSProperties = {
    maxWidth: '1000px',
    margin: '0 auto',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '2.5rem',
    fontWeight: 800,
    marginBottom: '10px',
    color: '#0f172a',
    textAlign: 'center',
  }

  const pollCardStyle: React.CSSProperties = {
    padding: '24px',
    marginBottom: '16px',
    borderRadius: '12px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s',
  }

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
    transition: 'all 0.2s',
  }

  if (!walletAddress) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <h1 style={titleStyle}>내가 만든 투표</h1>
          <p
            style={{ textAlign: 'center', color: '#64748b', marginTop: '20px' }}
          >
            MetaMask를 연결해주세요
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <h1 style={titleStyle}>내가 만든 투표</h1>
          <div style={{ marginTop: '40px' }}>
            <LoadingSpinner size="large" text="투표 목록을 불러오는 중..." color="#4facfe" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={titleStyle}>내가 만든 투표</h1>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Link
            href="/vote/new"
            style={{
              padding: '12px 24px',
              background: '#2563eb',
              color: '#fff',
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-block',
              fontWeight: 600,
              boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
            }}
          >
            + 새 투표 만들기
          </Link>
        </div>

        {polls.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#64748b',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <p
              style={{
                fontSize: '1.2rem',
                marginBottom: '10px',
                color: '#0f172a',
                fontWeight: 600,
              }}
            >
              아직 만든 투표가 없습니다
            </p>
            <p style={{ fontSize: '0.9rem' }}>
              "새 투표 만들기"를 클릭해서 첫 투표를 만들어보세요!
            </p>
          </div>
        ) : (
          <div>
            <p
              style={{
                textAlign: 'center',
                color: '#64748b',
                marginBottom: '20px',
                fontSize: '0.95rem',
              }}
            >
              총 {polls.length}개의 투표
            </p>

            {polls.map((poll) => (
              <div key={poll.pollId} style={pollCardStyle}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '20px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        margin: '0 0 8px 0',
                        fontSize: '1.3rem',
                        color: '#0f172a',
                      }}
                    >
                      {poll.title}
                    </h3>
                    {poll.description && (
                      <p
                        style={{
                          margin: '0 0 12px 0',
                          color: '#64748b',
                          fontSize: '0.9rem',
                        }}
                      >
                        {poll.description}
                      </p>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        gap: '12px',
                        flexWrap: 'wrap',
                        marginTop: '8px',
                      }}
                    >
                      <p
                        style={{
                          fontSize: '0.8rem',
                          color: '#94a3b8',
                          margin: 0,
                        }}
                      >
                        생성일:{' '}
                        {new Date(poll.createdAt).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p
                        style={{
                          fontSize: '0.8rem',
                          color: '#94a3b8',
                          margin: 0,
                        }}
                      >
                        • 마감:{' '}
                        {new Date(poll.endTime).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {/* 상태 표시 */}
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          backgroundColor:
                            poll.status === 'ended'
                              ? '#fee2e2'
                              : poll.status === 'active'
                              ? '#dcfce7'
                              : '#fef3c7',
                          color:
                            poll.status === 'ended'
                              ? '#dc2626'
                              : poll.status === 'active'
                              ? '#16a34a'
                              : '#d97706',
                        }}
                      >
                        {poll.status === 'ended'
                          ? '종료됨'
                          : poll.status === 'active'
                          ? '진행 중'
                          : '대기 중'}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <Link
                      href={`/vote/${poll.pollId}`}
                      style={{
                        ...buttonStyle,
                        background: '#2563eb',
                        color: '#fff',
                        textDecoration: 'none',
                        textAlign: 'center',
                      }}
                    >
                      {poll.status === 'ended' ? '결과 보기' : '보기'}
                    </Link>

                    <Link
                      href={`/qr/${poll.pollId}`}
                      style={{
                        ...buttonStyle,
                        background: '#f8fafc',
                        color: '#0f172a',
                        border: '1px solid #e2e8f0',
                        textDecoration: 'none',
                        textAlign: 'center',
                      }}
                    >
                      QR 코드
                    </Link>

                    <a
                      href={`/api/vote/${poll.pollId}/export?format=csv`}
                      download
                      style={{
                        ...buttonStyle,
                        background: '#dcfce7',
                        color: '#16a34a',
                        textDecoration: 'none',
                        textAlign: 'center',
                      }}
                    >
                      CSV 내보내기
                    </a>

                    <button
                      onClick={() => handleDelete(poll.pollId)}
                      style={{
                        ...buttonStyle,
                        background: '#fee2e2',
                        color: '#dc2626',
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
