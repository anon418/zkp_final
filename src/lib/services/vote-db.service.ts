/**
 * Vote DB 저장 서비스
 * 
 * @description
 * 투표 결과를 MongoDB에 저장하고 관리합니다.
 * 재투표 시 기존 문서를 업데이트하는 upsert 로직을 포함합니다.
 */

import Vote from '@/models/Vote'
import { info, warn } from '@/lib/logger'

export interface SaveVoteParams {
  pollId: string
  proposalId: number
  nullifierHash: string
  txHash: string
  merkleRoot: string
  voteCommitment: string
  isUpdate?: boolean | null
  existingVote?: boolean
}

export interface SaveVoteResult {
  success: boolean
  error?: string
}

/**
 * Vote를 DB에 저장하거나 업데이트합니다.
 * 재투표 시 기존 문서를 업데이트합니다 (upsert).
 */
export async function saveVoteToDB(
  params: SaveVoteParams
): Promise<SaveVoteResult> {
  const {
    pollId,
    proposalId,
    nullifierHash,
    txHash,
    merkleRoot,
    voteCommitment,
    isUpdate,
    existingVote,
  } = params

  try {
    // 재투표 시 기존 문서 업데이트, 첫 투표 시 새 문서 생성 (upsert)
    const voteData = {
      pollId,
      candidate: String(proposalId), // 후보 ID 저장 (결과 집계용)
      nullifierHash,
      txHash,
      // voterAddress는 저장하지 않음 - 익명성 보호
      status: 'confirmed',
      confirmedAt: new Date(),
      // Public Signals 저장 (영수증 표시용)
      merkleRoot,
      voteCommitment,
    }

    // upsert 사용: 같은 nullifierHash가 있으면 업데이트, 없으면 생성
    await Vote.findOneAndUpdate({ nullifierHash }, voteData, {
      upsert: true,
      new: true,
    })

    if (existingVote || isUpdate) {
      info(
        `[VoteDB] Vote updated (re-vote) for pollId ${pollId}, nullifier ${nullifierHash.substring(
          0,
          10
        )}... (기존 레코드 업데이트)`
      )
    } else {
      info(`[VoteDB] Vote created (first vote) for pollId ${pollId}`)
    }

    return { success: true }
  } catch (dbError: unknown) {
    // DB 저장 실패해도 블록체인 트랜잭션은 이미 성공했으므로, 경고만 기록
    const err = dbError as { message?: string }
    warn(
      `[VoteDB] ⚠️ DB 저장 실패 (블록체인 트랜잭션은 성공): ${
        err.message || 'Unknown error'
      }`
    )
    warn(
      `[VoteDB] ⚠️ 투표는 블록체인에 기록되었으므로, Etherscan에서 재구성 가능: ${txHash}`
    )
    // DB 저장 실패해도 블록체인 트랜잭션은 성공했으므로 계속 진행
    return {
      success: false,
      error: err.message || 'Unknown error',
    }
  }
}

