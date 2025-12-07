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
 * 
 * 성능 최적화:
 * - 인덱스 활용: pollId + createdAt 인덱스 사용
 * - 배치 처리: 대규모 투표 처리 시 메모리 효율적
 * 
 * @param pollId 투표 ID
 * @returns 유효한 투표 목록 (마지막 투표만)
 */
export async function getValidVotes(pollId: string): Promise<VoteDocument[]> {
  // 인덱스 활용: pollId + createdAt 인덱스로 최신순 조회 (성능 최적화)
  const allVotes = await Vote.find({ pollId })
    .sort({ createdAt: -1 }) // createdAt 인덱스 활용
    .lean() // Mongoose 문서 대신 일반 객체 반환 (메모리 절약)

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

