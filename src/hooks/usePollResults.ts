/**
 * 투표 결과 및 참여자 수를 관리하는 커스텀 훅
 * 
 * 기능:
 * - 실시간 투표 결과 조회 (10초마다 자동 갱신)
 * - 참여자 수 표시
 * - 마감된 투표는 자동으로 결과 표시
 * 
 * @param pollId - 투표 ID
 * @param pollData - 투표 데이터 (endTime 포함)
 * @returns { participantCount, voteResults, showResults, setShowResults }
 */
import { useState, useEffect } from 'react'

interface VoteResult {
  id: string
  label: string
  votes: number
}

export function usePollResults(pollId: string, pollData: { endTime: string } | null) {
  const [participantCount, setParticipantCount] = useState<number>(0)
  const [voteResults, setVoteResults] = useState<VoteResult[] | null>(null)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    if (!pollId || !pollData) return

    const fetchResults = async () => {
      try {
        const { getApiUrl } = await import('@/lib/api-utils')
        const resultsUrl = getApiUrl(`/api/vote/${pollId}/results`)
        const resultsRes = await fetch(resultsUrl)

        if (!resultsRes.ok) {
          const { error: logError } = await import('@/lib/logger')
          logError(`[PollDetail] Results API error: ${resultsRes.status}`)
          return
        }

        const resultsData = await resultsRes.json()
        if (resultsData.totalVotes !== undefined) {
          setParticipantCount(resultsData.totalVotes)
        }
        if (resultsData.results) {
          setVoteResults(resultsData.results)
        }
      } catch (err) {
        const { error: logError } = await import('@/lib/logger')
        logError('[PollDetail] Results fetch failed:', err)
      }
    }

    fetchResults() // 즉시 한 번 실행

    // 마감된 투표의 경우 자동으로 결과 표시
    const isEnded = new Date() > new Date(pollData.endTime)
    if (isEnded) {
      setShowResults(true)
    }

    // 진행 중인 투표만 실시간 업데이트 (10초마다)
    if (!isEnded) {
      const interval = setInterval(fetchResults, 10000)
      return () => clearInterval(interval)
    }
  }, [pollId, pollData])

  return { participantCount, voteResults, showResults, setShowResults }
}

