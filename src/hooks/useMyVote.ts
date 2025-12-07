/**
 * 현재 사용자의 투표 정보를 조회하는 커스텀 훅
 * 
 * 기능:
 * - 연결된 지갑 주소로 본인의 투표 여부 확인
 * - 투표한 경우 txHash와 publicSignals를 반환
 * - 영수증 표시에 사용
 * - 이전 선택한 후보 정보 반환 (로컬 스토리지에서)
 * 
 * @param pollId - 투표 ID
 * @returns { txHash, publicSignals, previousCandidate, setTxHash, setPublicSignals }
 */
import { useState, useEffect } from 'react'
import { useWallet } from '@/contexts/WalletContext'

export function useMyVote(pollId: string) {
  const { isConnected, address } = useWallet()
  const [txHash, setTxHash] = useState<string | null>(null)
  const [publicSignals, setPublicSignals] = useState<string[] | null>(null)
  const [previousCandidate, setPreviousCandidate] = useState<string | null>(null)
  const [isReVote, setIsReVote] = useState<boolean>(false)

  useEffect(() => {
    async function checkMyVote() {
      if (!pollId || !isConnected || !address) return

      // 로컬 스토리지에서 이전 선택지 확인
      if (typeof window !== 'undefined') {
        const storedCandidate = localStorage.getItem(`vote_${pollId}_candidate`)
        const storedTxHash = localStorage.getItem(`vote_${pollId}_txHash`)
        const storedNullifier = localStorage.getItem(`vote_${pollId}_nullifier`)
        const storedIsReVote = localStorage.getItem(`vote_${pollId}_isReVote`)
        
        if (storedCandidate && storedTxHash && storedNullifier) {
          setPreviousCandidate(storedCandidate)
          setTxHash(storedTxHash)
          // 재투표 여부 복원 (로컬 스토리지에서)
          const isReVoteValue = storedIsReVote === 'true'
          setIsReVote(isReVoteValue)
          // Public Signals 재구성 (로컬 스토리지에서)
          setPublicSignals([
            '0x' + '0'.repeat(64), // Merkle Root (로컬에는 없음)
            pollId,
            storedNullifier,
            '0x' + '0'.repeat(64), // Vote Commitment (로컬에는 없음)
          ])
        }
      }

      // 서버에서 최신 정보 확인 (로컬 스토리지와 동기화)
      try {
        const { getApiUrl } = await import('@/lib/api-utils')
        const myVoteUrl = getApiUrl(
          `/api/vote/${pollId}/my-vote?address=${encodeURIComponent(address)}`
        )

        console.log('📡 [PollDetail] 본인 투표 정보 조회:', myVoteUrl)
        const res = await fetch(myVoteUrl)

        if (!res.ok) {
          console.warn('⚠️ [PollDetail] 본인 투표 정보 조회 실패:', res.status)
          return
        }

        const data = await res.json()

        if (data.success && data.hasVoted && data.vote) {
          console.log('✅ [PollDetail] 본인 투표 정보 발견:', {
            txHash: data.vote.txHash?.substring(0, 10) + '...',
            nullifier: data.vote.nullifierHash?.substring(0, 10) + '...',
            candidate: data.vote.candidate,
            isReVote: data.isReVote,
          })

          // 영수증 표시를 위해 txHash 설정
          setTxHash(data.vote.txHash)

          // 재투표 여부 설정 (서버에서 확인한 값)
          const isReVoteValue = data.isReVote === true
          setIsReVote(isReVoteValue)
          
          // 로컬 스토리지에 isReVote 저장 (새로고침 후에도 유지)
          if (typeof window !== 'undefined') {
            localStorage.setItem(`vote_${pollId}_isReVote`, String(isReVoteValue))
          }

          // 이전 선택지 설정 (서버에서 가져온 값이 최신)
          if (data.vote.candidate) {
            setPreviousCandidate(data.vote.candidate)
          }

          // Public Signals 재구성 (DB에서 실제 값 가져오기)
          if (data.vote.nullifierHash) {
            setPublicSignals([
              data.vote.merkleRoot || '0x' + '0'.repeat(64), // Merkle Root (DB에서 가져옴)
              pollId, // Poll ID
              data.vote.nullifierHash, // Nullifier
              data.vote.voteCommitment || '0x' + '0'.repeat(64), // Vote Commitment (DB에서 가져옴)
            ])
          }
        } else {
          // 투표하지 않은 경우 재투표 여부 초기화
          setIsReVote(false)
        }
      } catch (err) {
        console.warn('⚠️ [PollDetail] 본인 투표 정보 조회 실패:', err)
      }
    }

    checkMyVote()
  }, [pollId, isConnected, address])

  return { txHash, publicSignals, previousCandidate, isReVote, setTxHash, setPublicSignals, setIsReVote }
}

