/**
 * 현재 사용자의 투표 정보를 조회하는 커스텀 훅
 * 
 * 기능:
 * - 연결된 지갑 주소로 본인의 투표 여부 확인
 * - 투표한 경우 txHash와 publicSignals를 반환
 * - 영수증 표시에 사용
 * 
 * @param pollId - 투표 ID
 * @returns { txHash, publicSignals, setTxHash, setPublicSignals }
 */
import { useState, useEffect } from 'react'
import { useWallet } from '@/contexts/WalletContext'

export function useMyVote(pollId: string) {
  const { isConnected, address } = useWallet()
  const [txHash, setTxHash] = useState<string | null>(null)
  const [publicSignals, setPublicSignals] = useState<string[] | null>(null)

  useEffect(() => {
    async function checkMyVote() {
      if (!pollId || !isConnected || !address) return

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
          })

          // 영수증 표시를 위해 txHash 설정
          setTxHash(data.vote.txHash)

          // Public Signals 재구성 (DB에서 실제 값 가져오기)
          if (data.vote.nullifierHash) {
            setPublicSignals([
              data.vote.merkleRoot || '0x' + '0'.repeat(64), // Merkle Root (DB에서 가져옴)
              pollId, // Poll ID
              data.vote.nullifierHash, // Nullifier
              data.vote.voteCommitment || '0x' + '0'.repeat(64), // Vote Commitment (DB에서 가져옴)
            ])
          }
        }
      } catch (err) {
        console.warn('⚠️ [PollDetail] 본인 투표 정보 조회 실패:', err)
      }
    }

    checkMyVote()
  }, [pollId, isConnected, address])

  return { txHash, publicSignals, setTxHash, setPublicSignals }
}

