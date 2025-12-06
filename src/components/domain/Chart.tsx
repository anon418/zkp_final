'use client'
import React, { useState, useEffect, memo } from 'react'
import { useParams } from 'next/navigation'
import { getPollResults, PollResult } from '@/lib/api'
import LoadingSpinner from '@/components/common/LoadingSpinner'

const Chart: React.FC = () => {
  const params = useParams()
  const pollId = params.pollId as string

  const [data, setData] = useState<PollResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 📌 API 호출
  const fetchResults = async () => {
    if (!pollId) return
    try {
      const res = await getPollResults(pollId)
      setData(res)
      setError(null)
    } catch (err) {
      console.warn('차트 API 실패 - 시연용 안전 모드로 변경')
      setError('집계 조회 실패 (시연 모드)')
      setData({
        pollId,
        title: '시연 모드 - 차트',
        totalVotes: 0,
        timestamp: '',
        results: [],
      })
    } finally {
      setLoading(false)
    }
  }

  // 1️⃣ 첫 로딩
  useEffect(() => {
    fetchResults()
  }, [pollId])

  // 2️⃣ 5초 간격 자동 새로고침
  useEffect(() => {
    const interval = setInterval(fetchResults, 5000)
    return () => clearInterval(interval)
  }, [pollId])

  const wrapperStyle: React.CSSProperties = {
    padding: 20,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    marginTop: 10,
  }

  const barStyle = (percent: number): React.CSSProperties => ({
    height: '20px',
    width: `${percent}%`,
    background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    borderRadius: '6px',
    transition: 'width .4s ease',
  })

  if (loading) return (
    <div style={{ ...wrapperStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
      <LoadingSpinner size="medium" text="차트 불러오는 중..." color="#4facfe" />
    </div>
  )

  if (!data)
    return <div style={wrapperStyle}>차트 데이터를 찾을 수 없습니다.</div>

  return (
    <div style={wrapperStyle}>
      <h3 style={{ marginBottom: 12 }}>📊 실시간 투표 현황</h3>

      {/* 투표가 하나도 없을 때 */}
      {data.totalVotes === 0 && (
        <p style={{ fontSize: 13, color: '#bbb' }}>
          아직 투표가 없습니다. 첫 표를 남겨보세요!
        </p>
      )}

      {/* 결과 리스트 */}
      {data.results.map((item) => {
        const count = item.count
        const percent =
          data.totalVotes > 0 ? Math.round((count / data.totalVotes) * 100) : 0
        return (
          <div key={item.candidate} style={{ marginBottom: 15 }}>
            <div
              style={{
                fontSize: 14,
                marginBottom: 4,
                color: 'rgba(255,255,255,0.8)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{item.candidate}</span>
              <span>
                {count}표 ({percent}%)
              </span>
            </div>
            <div style={barStyle(percent)} />
          </div>
        )
      })}

      <p
        style={{
          marginTop: 14,
          fontSize: 11,
          color: 'rgba(255,255,255,0.4)',
          textAlign: 'right',
        }}
      >
        자동 새로고침 · 5초 간격
      </p>
    </div>
  )
}

export default memo(Chart)
