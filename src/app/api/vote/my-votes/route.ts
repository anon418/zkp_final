/**
 * @swagger
 * /api/vote/my-votes:
 *   get:
 *     summary: 내 투표 내역 조회
 *     description: |
 *       지갑 주소로 투표한 내역을 조회합니다.
 *       로컬 스토리지에 저장된 nullifier와 DB의 투표 내역을 함께 반환합니다.
 *     tags: [Vote]
 *     parameters:
 *       - in: query
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: 지갑 주소
 *         example: "0x1234567890123456789012345678901234567890"
 *     responses:
 *       200:
 *         description: 투표 내역 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 votes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       pollId:
 *                         type: string
 *                         format: uuid
 *                       candidate:
 *                         type: string
 *                       txHash:
 *                         type: string
 *                       nullifierHash:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: 잘못된 요청 (address 파라미터 누락)
 */

import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import Vote from '@/models/Vote'
import Poll from '@/models/Poll'
import { createErrorResponse } from '@/lib/api-utils'
import { error, info } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get('address')

  if (!address) {
    const { response, status } = createErrorResponse(
      'MISSING_PARAMETER',
      'address 파라미터가 필요합니다.',
      400
    )
    return NextResponse.json(response, { status })
  }

  try {
    await dbConnect()

    // 지갑 주소로 투표 내역 조회
    const votes = await Vote.find({
      voterAddress: address.toLowerCase(),
    })
      .sort({ timestamp: -1 }) // 최신순
      .lean()

    // 각 투표에 대한 투표 정보 조회
    const votesWithPollInfo = await Promise.all(
      votes.map(async (vote) => {
        try {
          const poll = await Poll.findOne({ pollId: vote.pollId }).lean()
          const voteWithTimestamps = vote as typeof vote & {
            createdAt?: Date
            updatedAt?: Date
          }
          return {
            pollId: vote.pollId,
            title: poll?.title || '알 수 없음',
            candidate: vote.candidate,
            txHash: vote.txHash,
            nullifierHash: vote.nullifierHash,
            createdAt: voteWithTimestamps.createdAt || vote.timestamp,
            confirmedAt: vote.confirmedAt,
            status: vote.status || 'confirmed',
          }
        } catch (pollError) {
          error('[MyVotes] Poll 조회 실패:', pollError)
          const voteWithTimestamps = vote as typeof vote & {
            createdAt?: Date
            updatedAt?: Date
          }
          return {
            pollId: vote.pollId,
            title: '알 수 없음',
            candidate: vote.candidate,
            txHash: vote.txHash,
            nullifierHash: vote.nullifierHash,
            createdAt: voteWithTimestamps.createdAt || vote.timestamp,
            confirmedAt: vote.confirmedAt,
            status: vote.status || 'confirmed',
          }
        }
      })
    )

    info(`[MyVotes] ${address}의 투표 내역 조회: ${votesWithPollInfo.length}개`)

    return NextResponse.json({
      success: true,
      votes: votesWithPollInfo,
      total: votesWithPollInfo.length,
    })
  } catch (err: unknown) {
    const errorObj = err as { message?: string }
    error('[MyVotes] 오류:', errorObj)
    const { response, status } = createErrorResponse(
      'INTERNAL_ERROR',
      errorObj.message || '투표 내역 조회 중 오류가 발생했습니다.',
      500
    )
    return NextResponse.json(response, { status })
  }
}

