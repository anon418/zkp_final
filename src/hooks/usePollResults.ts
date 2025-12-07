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

    let intervalId: NodeJS.Timeout | null = null
    let retryTimeoutId: NodeJS.Timeout | null = null
    let retryCount = 0
    const MAX_RETRIES = 3
    const BASE_INTERVAL = 30000 // 30초 (기본 간격, 10초에서 증가)
    const BACKOFF_MULTIPLIER = 2 // 429 에러 시 간격 2배 증가

    const fetchResults = async () => {
      try {
        const { getApiUrl } = await import('@/lib/api-utils')
        const resultsUrl = getApiUrl(`/api/vote/${pollId}/results`)
        const resultsRes = await fetch(resultsUrl)

        if (!resultsRes.ok) {
          const { error: logError, warn: logWarn } = await import('@/lib/logger')
          
          // 429 에러 (Too Many Requests) 처리
          if (resultsRes.status === 429) {
            logWarn(`[PollDetail] Rate limit reached (429). Increasing polling interval...`)
            
            // 재시도 횟수 증가
            retryCount++
            
            // 최대 재시도 횟수 초과 시 폴링 중단
            if (retryCount > MAX_RETRIES) {
              logWarn(`[PollDetail] Max retries reached. Stopping automatic polling.`)
              // 기존 interval 정리
              if (intervalId) {
                clearInterval(intervalId)
                intervalId = null
              }
              return
            }
            
            // Exponential backoff: 간격을 2배로 증가
            const newInterval = BASE_INTERVAL * Math.pow(BACKOFF_MULTIPLIER, retryCount)
            logWarn(`[PollDetail] Retrying after ${newInterval / 1000}s...`)
            
            // 기존 retry timeout 정리
            if (retryTimeoutId) {
              clearTimeout(retryTimeoutId)
            }
            
            // 새로운 간격으로 재시도
            retryTimeoutId = setTimeout(() => {
              retryCount = 0 // 성공 시 재시도 카운터 리셋
              fetchResults()
            }, newInterval)
            
            return
          }
          
          // 다른 에러는 로그만 남기고 계속 진행
          logError(`[PollDetail] Results API error: ${resultsRes.status}`)
          return
        }

        // 성공 시 재시도 카운터 리셋 및 정상 interval 재개
        retryCount = 0
        
        // retry timeout이 있으면 정리하고 정상 interval 재시작
        if (retryTimeoutId) {
          clearTimeout(retryTimeoutId)
          retryTimeoutId = null
        }
        
        // interval이 없으면 재시작
        if (!intervalId) {
          const isEnded = new Date() > new Date(pollData.endTime)
          if (!isEnded) {
            intervalId = setInterval(fetchResults, BASE_INTERVAL)
          }
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

    // 진행 중인 투표만 실시간 업데이트 (30초마다, 10초에서 증가)
    if (!isEnded) {
      intervalId = setInterval(fetchResults, BASE_INTERVAL)
    }
    
    // Cleanup 함수
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId)
      }
    }
  }, [pollId, pollData])

  return { participantCount, voteResults, showResults, setShowResults }
}

