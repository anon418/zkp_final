/**
 * @swagger
 * /api/vote/{pollId}/my-vote:
 *   get:
 *     summary: 특정 투표에 대한 본인 투표 여부 확인
 *     description: |
 *       특정 pollId에 대해 지갑 주소로 투표했는지 확인하고, 투표 정보를 반환합니다.
 *       영수증 표시를 위해 사용됩니다.
 *     tags: [Vote]
 *     parameters:
 *       - in: path
 *         name: pollId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 투표 ID
 *       - in: query
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: 지갑 주소
 *     responses:
 *       200:
 *         description: 투표 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 hasVoted:
 *                   type: boolean
 *                 vote:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     txHash:
 *                       type: string
 *                     nullifierHash:
 *                       type: string
 *                     candidate:
 *                       type: string
 *                     confirmedAt:
 *                       type: string
 *       400:
 *         description: 잘못된 요청
 */

import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import Vote from '@/models/Vote'
import { createErrorResponse } from '@/lib/api-utils'
import { error, info } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get('address')
  const { pollId } = await params

  if (!address) {
    const { response, status } = createErrorResponse(
      'MISSING_PARAMETER',
      'address 파라미터가 필요합니다.',
      400
    )
    return NextResponse.json(response, { status })
  }

  if (!pollId) {
    const { response, status } = createErrorResponse(
      'MISSING_PARAMETER',
      'pollId가 필요합니다.',
      400
    )
    return NextResponse.json(response, { status })
  }

  try {
    await dbConnect()

    // 특정 pollId와 address로 투표 내역 조회
    const vote = await Vote.findOne({
      pollId,
      voterAddress: address.toLowerCase(),
    })
      .sort({ timestamp: -1 }) // 최신순 (재투표인 경우 마지막 투표)
      .lean()

    if (vote) {
      info(
        `[MyVote] ${address}가 pollId ${pollId}에 투표함: txHash=${vote.txHash?.substring(0, 10)}...`
      )
      return NextResponse.json({
        success: true,
        hasVoted: true,
        vote: {
          txHash: vote.txHash,
          nullifierHash: vote.nullifierHash,
          candidate: vote.candidate,
          confirmedAt: vote.confirmedAt,
          status: vote.status || 'confirmed',
          merkleRoot: vote.merkleRoot, // ZKP Public Signal [0]
          voteCommitment: vote.voteCommitment, // ZKP Public Signal [3]
        },
      })
    } else {
      return NextResponse.json({
        success: true,
        hasVoted: false,
        vote: null,
      })
    }
  } catch (err: unknown) {
    const errorObj = err as { message?: string }
    error('[MyVote] 오류:', errorObj)
    const { response, status } = createErrorResponse(
      'INTERNAL_ERROR',
      errorObj.message || '투표 정보 조회 중 오류가 발생했습니다.',
      500
    )
    return NextResponse.json(response, { status })
  }
}

