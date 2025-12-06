/**
 * 투표 집계 유틸리티
 * 
 * 재투표 정책: 같은 nullifierHash를 가진 투표 중 가장 최근 것만 집계
 * (마지막 투표만 유효)
 */

import Vote from '@/models/Vote'

export interface VoteDocument {
  _id: unknown
  pollId: string
  candidate?: string | null
  nullifierHash?: string | null
  createdAt?: Date
  timestamp?: Date
}

/**
 * 재투표 정책을 적용하여 유효한 투표만 반환
 * @param pollId 투표 ID
 * @returns 유효한 투표 목록 (마지막 투표만)
 */
export async function getValidVotes(pollId: string): Promise<VoteDocument[]> {
  // 모든 투표를 최신순으로 조회
  const allVotes = await Vote.find({ pollId }).sort({ timestamp: -1 })

  // nullifierHash별로 가장 최근 투표만 선택 (마지막 투표만 유효)
  const latestVotesByNullifier = new Map<string, VoteDocument>()
  
  allVotes.forEach((vote) => {
    if (vote.nullifierHash) {
      const existing = latestVotesByNullifier.get(vote.nullifierHash)
      const voteWithTimestamps = vote as typeof vote & {
        createdAt?: Date
        updatedAt?: Date
      }
      const voteTime = new Date(
        voteWithTimestamps.createdAt || vote.timestamp || 0
      )
      const existingWithTimestamps = existing as typeof existing & {
        createdAt?: Date
        updatedAt?: Date
      } | null
      const existingTime = existingWithTimestamps
        ? new Date(
            existingWithTimestamps.createdAt ||
              existingWithTimestamps.timestamp ||
              0
          )
        : new Date(0)

      if (!existing || voteTime > existingTime) {
        latestVotesByNullifier.set(vote.nullifierHash, vote as VoteDocument)
      }
    } else {
      // nullifierHash가 없는 경우 (레거시 데이터) 그대로 사용
      latestVotesByNullifier.set(vote._id.toString(), vote as VoteDocument)
    }
  })

  // 최종 집계할 투표 목록 (마지막 투표만)
  return Array.from(latestVotesByNullifier.values())
}

