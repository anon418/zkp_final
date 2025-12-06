/**
 * @swagger
 * /api/vote/{pollId}:
 *   get:
 *     summary: 투표 상세 조회 (관리자용)
 *     description: |
 *       투표의 상세 정보를 조회합니다. **관리자용**으로 민감한 정보(merkleRoot 등)를 포함합니다.
 *       
 *       ⚠️ **무결성 보호**: 투표 내용은 생성 후 수정 불가
 *       - title, description, candidates, startTime, endTime, merkleRoot는 불변
 *       - 관리자도 예외 없이 수정 불가
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
 *         description: 투표 상세 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 poll:
 *                   type: object
 *                   properties:
 *                     pollId:
 *                       type: string
 *                       format: uuid
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     candidates:
 *                       type: array
 *                       items:
 *                         type: object
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                     endTime:
 *                       type: string
 *                       format: date-time
 *                     creatorWallet:
 *                       type: string
 *                     merkleRoot:
 *                       type: string
 *                       description: Merkle Root (관리자용 - 민감 정보)
 *                     chainId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                 immutable:
 *                   type: boolean
 *                   example: true
 *                   description: 수정 불가 플래그
 *                 message:
 *                   type: string
 *       404:
 *         description: 투표를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "POLL_NOT_FOUND"
 *                 message:
 *                   type: string
 *       500:
 *         description: 서버 오류
 *   put:
 *     summary: 투표 수정 (차단됨)
 *     description: |
 *       투표 수정은 무결성 보호를 위해 차단됩니다.
 *       관리자도 예외 없이 수정할 수 없습니다.
 *     tags: [Vote]
 *     parameters:
 *       - in: path
 *         name: pollId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       403:
 *         description: 수정 불가 (무결성 보호)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "IMMUTABLE_POLL"
 *                 message:
 *                   type: string
 *   patch:
 *     summary: 투표 수정 (차단됨)
 *     description: |
 *       투표 수정은 무결성 보호를 위해 차단됩니다.
 *       관리자도 예외 없이 수정할 수 없습니다.
 *     tags: [Vote]
 *     parameters:
 *       - in: path
 *         name: pollId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       403:
 *         description: 수정 불가 (무결성 보호)
 */

import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import Poll from '@/models/Poll'

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

    // 관리자용 상세 정보 (merkleRoot 포함)
    return NextResponse.json({
      success: true,
      poll: {
        pollId: poll.pollId,
        title: poll.title,
        description: poll.description,
        candidates: poll.candidates,
        startTime: poll.startTime,
        endTime: poll.endTime,
        creatorWallet: poll.creatorWallet,
        merkleRoot: poll.merkleRoot,
        chainId: poll.chainId,
        status: poll.status,
        createdAt: poll.createdAt,
      },
      // 무결성 보호 안내
      immutable: true,
      message:
        '이 투표는 생성 후 수정할 수 없습니다. 무결성을 위해 모든 수정이 차단됩니다.',
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    const { error: logError } = await import('@/lib/logger')
    logError(`[Vote] GET /:pollId error:`, err)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '투표 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT/PATCH 엔드포인트는 의도적으로 제공하지 않음 (무결성 보호)
// 수정 시도 시 명시적으로 거부
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  return NextResponse.json(
    {
      error: 'IMMUTABLE_POLL',
      message:
        '투표 내용은 생성 후 수정할 수 없습니다. 무결성을 위해 모든 수정이 차단됩니다. (관리자 포함)',
    },
    { status: 403 }
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  return NextResponse.json(
    {
      error: 'IMMUTABLE_POLL',
      message:
        '투표 내용은 생성 후 수정할 수 없습니다. 무결성을 위해 모든 수정이 차단됩니다. (관리자 포함)',
    },
    { status: 403 }
  )
}
