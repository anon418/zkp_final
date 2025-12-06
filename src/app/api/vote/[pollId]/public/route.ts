/**
 * @swagger
 * /api/vote/{pollId}/public:
 *   get:
 *     summary: 공개 투표 정보 조회
 *     description: 투표 참여를 위한 공개 정보를 조회합니다. 민감한 정보(merkleRoot 등)는 제외됩니다.
 *     tags: [Vote]
 *     parameters:
 *       - in: path
 *         name: pollId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 투표 ID
 *         example: "344e5607-eede-4eff-a02c-57eafc194291"
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
 *                   example: true
 *                 poll:
 *                   $ref: '#/components/schemas/Poll'
 *                 root:
 *                   type: string
 *                   pattern: "^0x[a-fA-F0-9]{64}$"
 *                   description: Merkle Root (Open Poll의 경우 0x00...00)
 *       404:
 *         description: 투표를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import Poll from '@/models/Poll'
import { ethers } from 'ethers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  try {
    const { pollId } = await params

    // DB 연결
    await dbConnect()

    // Poll 조회
    const poll = await Poll.findOne({ pollId })

    if (!poll) {
      return NextResponse.json(
        { error: 'POLL_NOT_FOUND', message: '투표를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 현재 시간과 비교
    const now = new Date()
    let status = poll.status

    if (now < poll.startTime) {
      status = 'pending'
    } else if (now > poll.endTime) {
      status = 'ended'
    } else {
      status = 'active'
    }

    // 참여자용 공개 정보만 반환 (merkleProof는 별도 API에서 생성)
    const merkleRoot = poll.merkleRoot || ethers.ZeroHash

    return NextResponse.json({
      success: true,
      poll: {
        pollId: poll.pollId,
        title: poll.title,
        description: poll.description,
        candidates: poll.candidates,
        startTime: poll.startTime,
        endTime: poll.endTime,
        chainId: poll.chainId,
        status,
        isActive: now >= poll.startTime && now <= poll.endTime,
      },
      root: merkleRoot,
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    const { error: logError } = await import('@/lib/logger')
    logError(`[Vote] GET /:pollId/public error:`, err)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '투표 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
