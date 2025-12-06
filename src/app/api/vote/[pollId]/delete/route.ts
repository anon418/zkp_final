/**
 * @swagger
 * /api/vote/{pollId}/delete:
 *   delete:
 *     summary: 투표 삭제
 *     description: |
 *       투표를 삭제합니다. **생성자만 삭제 가능**하며, 관리자도 예외 없습니다.
 *       
 *       투표와 관련된 모든 Vote 데이터가 함께 삭제됩니다.
 *     tags: [Vote]
 *     parameters:
 *       - in: path
 *         name: pollId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 투표 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - creatorWallet
 *             properties:
 *               creatorWallet:
 *                 type: string
 *                 pattern: "^0x[a-fA-F0-9]{40}$"
 *                 description: 생성자 지갑 주소 (권한 확인용)
 *     responses:
 *       200:
 *         description: 투표 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "투표가 삭제되었습니다."
 *                 deletedVotes:
 *                   type: integer
 *                   example: 42
 *       400:
 *         description: creatorWallet 누락 또는 형식 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 권한 없음 (생성자가 아님)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
import Vote from '@/models/Vote'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  try {
    const { pollId } = await params

    // 요청 바디에서 creatorWallet 가져오기 (쿼리 파라미터보다 안전)
    let creatorWallet: string | null = null
    try {
      const body = await request.json().catch(() => ({}))
      creatorWallet = body.creatorWallet || null
    } catch {
      // JSON 파싱 실패 시 쿼리 파라미터로 폴백 (하위 호환성)
      const { searchParams } = new URL(request.url)
      creatorWallet = searchParams.get('creatorWallet')
    }

    if (!creatorWallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_CREATOR',
          message:
            'creatorWallet이 필요합니다. 요청 바디에 { creatorWallet: "0x..." }를 포함하세요.',
        },
        { status: 400 }
      )
    }

    // 지갑 주소 형식 검증
    if (!/^0x[a-fA-F0-9]{40}$/.test(creatorWallet)) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_ADDRESS',
          message: '유효하지 않은 지갑 주소 형식입니다.',
        },
        { status: 400 }
      )
    }

    // DB 연결
    await dbConnect()

    // Poll 조회
    const poll = await Poll.findOne({ pollId })

    if (!poll) {
      return NextResponse.json(
        {
          success: false,
          error: 'POLL_NOT_FOUND',
          message: '투표를 찾을 수 없습니다.',
        },
        { status: 404 }
      )
    }

    // 🔒 권한 확인: 생성자만 삭제 가능 (관리자도 예외 없음)
    const normalizedCreator = creatorWallet.toLowerCase()
    const normalizedPollCreator = poll.creatorWallet.toLowerCase()

    if (normalizedPollCreator !== normalizedCreator) {
      const { warn } = await import('@/lib/logger')
      warn(
        `[Vote] Unauthorized delete attempt: pollId=${pollId}, requestedBy=${normalizedCreator}, actualCreator=${normalizedPollCreator}`
      )
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message:
            '투표를 생성한 사람만 삭제할 수 있습니다. (관리자도 예외 없음)',
        },
        { status: 403 }
      )
    }

    // Poll 삭제
    await Poll.deleteOne({ pollId })

    // 관련 Vote 데이터도 삭제
    const voteDeleteResult = await Vote.deleteMany({ pollId })

    const { debug } = await import('@/lib/logger')
    debug(`[Vote] Deleted poll: ${pollId} by ${creatorWallet}`)
    debug(`[Vote] Deleted ${voteDeleteResult.deletedCount} votes`)

    return NextResponse.json({
      success: true,
      message: '투표가 삭제되었습니다.',
      deletedVotes: voteDeleteResult.deletedCount,
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    const { error: logError } = await import('@/lib/logger')
    logError('[Vote] DELETE error:', err)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: '투표 삭제 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}
