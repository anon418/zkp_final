/**
 * @swagger
 * /api/vote/{pollId}/merkle-proof:
 *   get:
 *     summary: Merkle Proof 생성
 *     description: |
 *       유권자별 Merkle Proof를 생성합니다.
 *       
 *       **Open Poll**: merkleRoot가 0x00...00인 경우 placeholder proof 반환 (모든 유권자 허용)
 *       **Closed Poll**: 실제 Merkle Tree를 구성하여 proof 생성
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
 *         name: identityNullifier
 *         required: true
 *         schema:
 *           type: string
 *         description: 유권자의 identity nullifier
 *     responses:
 *       200:
 *         description: Merkle Proof 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 root:
 *                   type: string
 *                   pattern: "^0x[a-fA-F0-9]{64}$"
 *                   description: Merkle Root
 *                 merkleProof:
 *                   type: object
 *                   properties:
 *                     pathElements:
 *                       type: array
 *                       items:
 *                         type: string
 *                     pathIndices:
 *                       type: array
 *                       items:
 *                         type: integer
 *       400:
 *         description: 파라미터 누락 또는 유권자 없음
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
 *         description: Merkle Proof 생성 실패 또는 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import Poll from '@/models/Poll'
import Voter from '@/models/Voter'
import { ethers } from 'ethers'
// generateMerkleProofForVoter는 Closed Poll일 때만 동적 import

// API Route 타임아웃 설정 (초 단위)
export const maxDuration = 30 // 30초 (Open Poll은 1초 미만, Closed Poll은 최대 30초)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  const startTime = Date.now()
  const { debug, error: logError } = await import('@/lib/logger')
  debug(`[Merkle-Proof] Request started at ${new Date().toISOString()}`)

  try {
    const { pollId } = await params
    const { searchParams } = new URL(request.url)
    const identityNullifier = searchParams.get('identityNullifier')

    debug(
      `[Merkle-Proof] PollId: ${pollId}, Nullifier: ${identityNullifier?.substring(
        0,
        10
      )}...`
    )

    if (!identityNullifier) {
      return NextResponse.json(
        {
          error: 'MISSING_PARAM',
          message: 'identityNullifier 파라미터가 필요합니다.',
        },
        { status: 400 }
      )
    }

    // DB 연결
    debug('[Merkle-Proof] Connecting to DB...')
    await dbConnect()
    debug('[Merkle-Proof] DB connected')

    // Poll 조회
    debug(`[Merkle-Proof] Fetching poll: ${pollId}`)
    const poll = await Poll.findOne({ pollId })
    if (!poll) {
      logError(`[Merkle-Proof] Poll not found: ${pollId}`)
      return NextResponse.json(
        { error: 'POLL_NOT_FOUND', message: '투표를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    debug(`[Merkle-Proof] Poll found: ${poll.title}`)

    // Merkle root 가져오기
    const merkleRoot = poll.merkleRoot || ethers.ZeroHash
    debug(`[Merkle-Proof] Merkle root: ${merkleRoot.substring(0, 10)}...`)

    // merkleRoot가 0x00...00인 경우 (모든 유권자 허용)
    const isOpenPoll =
      merkleRoot === ethers.ZeroHash || merkleRoot === '0x' + '0'.repeat(64)

    debug(`[Merkle-Proof] Is Open Poll: ${isOpenPoll}`)

    let resultRoot: string
    let merkleProof: { pathElements: string[]; pathIndices: number[] }

    if (isOpenPoll) {
      // Open Poll: 모든 유권자 허용
      // Merkle Tree 검증을 건너뛰기 위한 placeholder proof
      // (ZKP 회로에서 merkleRoot가 0이면 검증을 건너뜀)
      // 이는 설계상 의도된 동작이며, Open Poll의 특성상 모든 유권자를 허용
      const { debug } = await import('@/lib/logger')
      debug('[Merkle-Proof] Returning placeholder proof for Open Poll')
      resultRoot = merkleRoot
      merkleProof = {
        pathElements: Array(14).fill('0'),
        pathIndices: Array(14).fill(0),
      }
      debug(
        `[Merkle-Proof] Placeholder proof generated in ${Date.now() - startTime}ms`
      )
    } else {
      // Closed Poll: 실제 Merkle Tree 구성 (동적 import)
      debug('[Merkle-Proof] Closed Poll - loading merkle library...')
      const { generateMerkleProofForVoter } = await import('@/lib/merkle')
      const { warn } = await import('@/lib/logger')
      try {
        // 실제 Merkle tree 사용: 등록된 모든 유권자로 tree 구성
        const voters = await Voter.find({}).select('identityNullifier').lean()

        if (voters.length === 0) {
          return NextResponse.json(
            {
              error: 'NO_VOTERS',
              message: '등록된 유권자가 없습니다.',
            },
            { status: 400 }
          )
        }

        // 실제 Merkle tree 구성 및 proof 생성
        debug(
          `[Merkle] Generating proof for voter with nullifier: ${identityNullifier.substring(
            0,
            10
          )}... (total voters: ${voters.length})`
        )

        const result = await generateMerkleProofForVoter(
          voters.map((v) => ({
            identityNullifier: v.identityNullifier || '',
          })),
          pollId,
          identityNullifier
        )

        resultRoot = result.root
        merkleProof = result.merkleProof

        debug(
          `[Merkle] Proof generated: root=${resultRoot.substring(
            0,
            10
          )}..., pathElements=${merkleProof.pathElements.length}`
        )

        // 생성된 root와 저장된 root 일치 확인
        if (resultRoot.toLowerCase() !== merkleRoot.toLowerCase()) {
          warn(
            `[Merkle] Root mismatch: generated=${resultRoot}, stored=${merkleRoot}`
          )
          // 경고만 하고 계속 진행 (나중에 root 업데이트 필요할 수 있음)
        }
      } catch (merkleError: unknown) {
        const err = merkleError as { message?: string }
        logError('[Merkle] Error generating proof:', err)
        return NextResponse.json(
          {
            error: 'MERKLE_PROOF_ERROR',
            message: `Merkle proof 생성 실패: ${err.message || 'Unknown error'}`,
          },
          { status: 500 }
        )
      }
    }

    const response = {
      success: true,
      root: resultRoot,
      merkleProof,
    }

    debug(`[Merkle-Proof] Response ready in ${Date.now() - startTime}ms`)
    return NextResponse.json(response)
  } catch (error: unknown) {
    const err = error as { message?: string }
    logError(
      `[Merkle-Proof] Error after ${Date.now() - startTime}ms:`,
      err
    )
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: `Merkle proof 생성 중 오류가 발생했습니다: ${err.message || 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}
