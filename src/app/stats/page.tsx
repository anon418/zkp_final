'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface Stats {
  totalPolls: number
  totalVotes: number
  activePolls: number
  endedPolls: number
  todayPolls: number
  todayVotes: number
  topPolls: Array<{
    pollId: string
    title: string
    voteCount: number
  }>
}

interface PollResult {
  id: string
  label: string
  votes: number
}

interface TopPollWithResults {
  pollId: string
  title: string
  voteCount: number
  results?: PollResult[]
  totalVotes?: number
  loading?: boolean
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [topPollsWithResults, setTopPollsWithResults] = useState<
    TopPollWithResults[]
  >([])

  useEffect(() => {
    async function loadStats() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
        const url = apiUrl ? `${apiUrl}/api/stats` : '/api/stats'

        const res = await fetch(url)
        const json = await res.json()

        if (json.success) {
          setStats(json.stats)
          // Top 5 투표의 결과를 각각 가져오기
          if (json.stats.topPolls && json.stats.topPolls.length > 0) {
            loadTopPollResults(json.stats.topPolls)
          }
        }
      } catch (err) {
        console.error('통계 조회 실패:', err)
        // API 호출 실패 시 기본값 설정 (에러 표시용)
        setStats({
          totalPolls: 0,
          totalVotes: 0,
          activePolls: 0,
          endedPolls: 0,
          todayPolls: 0,
          todayVotes: 0,
          topPolls: [],
        })
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  // Top 5 투표의 결과를 각각 가져오기
  async function loadTopPollResults(topPolls: Stats['topPolls']) {
    // 초기 상태 설정 (로딩 중)
    const initialPolls: TopPollWithResults[] = topPolls.map((poll) => ({
      ...poll,
      loading: true,
    }))
    setTopPollsWithResults(initialPolls)

    // 각 투표의 결과를 병렬로 가져오기
    const results = await Promise.allSettled(
      topPolls.map(async (poll) => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
          const url = apiUrl
            ? `${apiUrl}/api/vote/${poll.pollId}/results`
            : `/api/vote/${poll.pollId}/results`

          const res = await fetch(url)
          const json = await res.json()

          if (json.success) {
            return {
              pollId: poll.pollId,
              title: poll.title,
              voteCount: poll.voteCount,
              results: json.results || [],
              totalVotes: json.totalVotes || 0,
              loading: false,
            }
          }
          return {
            pollId: poll.pollId,
            title: poll.title,
            voteCount: poll.voteCount,
            loading: false,
          }
        } catch (err) {
          console.error(`투표 ${poll.pollId} 결과 조회 실패:`, err)
          return {
            pollId: poll.pollId,
            title: poll.title,
            voteCount: poll.voteCount,
            loading: false,
          }
        }
      })
    )

    // 결과 업데이트
    const updatedPolls: TopPollWithResults[] = results.map((result, idx) => {
      if (result.status === 'fulfilled') {
        return result.value
      }
      return {
        pollId: topPolls[idx].pollId,
        title: topPolls[idx].title,
        voteCount: topPolls[idx].voteCount,
        loading: false,
      }
    })

    setTopPollsWithResults(updatedPolls)
  }

  if (loading || !stats) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background:
            'radial-gradient(circle at 50% -20%, #1a1f35, #09090b 80%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LoadingSpinner size="large" text="통계를 불러오는 중..." color="#4facfe" />
      </div>
    )
  }

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'radial-gradient(circle at 50% -20%, #1a1f35, #09090b 80%)',
    color: '#fff',
    padding: '40px 20px',
    fontFamily: 'sans-serif',
  }

  const containerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '2.5rem',
    fontWeight: 800,
    marginBottom: '40px',
    background: 'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textAlign: 'center',
  }

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  }

  const cardStyle: React.CSSProperties = {
    padding: '30px',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    textAlign: 'center',
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Link
          href="/"
          style={{
            color: '#4facfe',
            textDecoration: 'none',
            fontSize: '0.9rem',
            display: 'inline-block',
            marginBottom: '20px',
          }}
        >
          ← 홈으로
        </Link>

        <h1 style={titleStyle}>📊 투표 통계</h1>

        {/* 전체 통계 */}
        <div style={gridStyle}>
          <div style={cardStyle}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🗳️</div>
            <div
              style={{ fontSize: '2rem', fontWeight: 700, color: '#4facfe' }}
            >
              {stats.totalPolls}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
              총 투표 수
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>👥</div>
            <div
              style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}
            >
              {stats.totalVotes}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
              총 참여 수
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🟢</div>
            <div
              style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}
            >
              {stats.activePolls}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
              진행 중
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔴</div>
            <div
              style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}
            >
              {stats.endedPolls}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
              종료됨
            </div>
          </div>
        </div>

        {/* 오늘 통계 */}
        <div style={{ marginBottom: '40px' }}>
          <h2
            style={{
              fontSize: '1.5rem',
              marginBottom: '20px',
              color: '#00f2fe',
            }}
          >
            📅 오늘
          </h2>
          <div style={gridStyle}>
            <div style={cardStyle}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📝</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {stats.todayPolls}
              </div>
              <div
                style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}
              >
                생성된 투표
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🗳️</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {stats.todayVotes}
              </div>
              <div
                style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}
              >
                참여 수
              </div>
            </div>
          </div>
        </div>

        {/* 인기 투표 Top 5 */}
        <div>
          <h2
            style={{
              fontSize: '1.5rem',
              marginBottom: '20px',
              color: '#00f2fe',
            }}
          >
            🏆 인기 투표 Top 5
          </h2>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {(topPollsWithResults.length > 0
              ? topPollsWithResults
              : stats.topPolls.map((p) => ({ ...p, loading: true }))
            ).map((poll, idx) => (
              <Link
                key={poll.pollId}
                href={`/vote/${poll.pollId}`}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  textDecoration: 'none',
                  color: '#fff',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                  e.currentTarget.style.borderColor = 'rgba(79, 172, 254, 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '20px',
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', flex: 1 }}
                  >
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color:
                          idx === 0
                            ? '#fbbf24'
                            : idx === 1
                            ? '#d1d5db'
                            : idx === 2
                            ? '#f97316'
                            : '#888',
                        minWidth: '30px',
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          marginBottom: '8px',
                        }}
                      >
                        {poll.title}
                      </div>
                      {poll.loading ? (
                        <div
                          style={{
                            fontSize: '0.85rem',
                            color: 'rgba(255,255,255,0.5)',
                          }}
                        >
                          결과 로딩 중...
                        </div>
                      ) : (!poll.loading && 'results' in poll && poll.results && poll.results.length > 0) ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            marginTop: '8px',
                          }}
                        >
                          {poll.results
                            .sort((a, b) => b.votes - a.votes)
                            .slice(0, 3)
                            .map((result, rIdx) => {
                              const percentage =
                                poll.totalVotes && poll.totalVotes > 0
                                  ? ((result.votes / poll.totalVotes) * 100).toFixed(1)
                                  : '0'
                              return (
                                <div
                                  key={result.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: '4px',
                                      height: '4px',
                                      borderRadius: '50%',
                                      background:
                                        rIdx === 0
                                          ? '#22c55e'
                                          : rIdx === 1
                                          ? '#4facfe'
                                          : '#a855f7',
                                    }}
                                  />
                                  <span
                                    style={{
                                      color: 'rgba(255,255,255,0.7)',
                                      flex: 1,
                                    }}
                                  >
                                    {result.label}
                                  </span>
                                  <span
                                    style={{
                                      color: 'rgba(255,255,255,0.9)',
                                      fontWeight: 600,
                                      minWidth: '60px',
                                      textAlign: 'right',
                                    }}
                                  >
                                    {result.votes}표 ({percentage}%)
                                  </span>
                                </div>
                              )
                            })}
                          {'results' in poll && poll.results && poll.results.length > 3 && (
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'rgba(255,255,255,0.5)',
                                marginTop: '4px',
                              }}
                            >
                              +{poll.results.length - 3}개 후보 더보기
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: '0.85rem',
                            color: 'rgba(255,255,255,0.5)',
                          }}
                        >
                          아직 투표가 없습니다
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '8px 14px',
                      borderRadius: '20px',
                      background: 'rgba(79,172,254,0.2)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    👥 {poll.voteCount}명
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
