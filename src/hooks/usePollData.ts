/**
 * 투표 정보를 불러오는 커스텀 훅
 * 
 * @param pollId - 투표 ID (UUID)
 * @returns { pollData, loading } - 투표 정보와 로딩 상태
 */
import { useState, useEffect } from 'react'
import { getPollPublic, PollPublic } from '@/lib/api'
import { useUiStore } from '@/store/uiStore'

export function usePollData(pollId: string) {
  const { notifyError } = useUiStore()
  const [pollData, setPollData] = useState<PollPublic | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        console.log('📡 [PollDetail] 투표 정보 불러오기 시작:', pollId)
        const data = await getPollPublic(pollId)
        console.log('✅ [PollDetail] 투표 정보 받음:', data)
        setPollData(data)
      } catch (error: unknown) {
        const err = error as { message?: string }
        const { error: logError } = await import('@/lib/logger')
        logError('❌ [PollDetail] 투표 정보 불러오기 실패:', err)
        logError('   메시지:', err.message)
        logError('   상세:', err)
        notifyError(
          '투표 정보를 불러올 수 없습니다: ' +
            (err.message || '알 수 없는 오류')
        )
        setPollData(null)
      } finally {
        setLoading(false)
      }
    }
    if (pollId) {
      load()
    } else {
      console.error('❌ [PollDetail] pollId가 없습니다!')
      setLoading(false)
    }
  }, [pollId, notifyError])

  return { pollData, loading }
}

