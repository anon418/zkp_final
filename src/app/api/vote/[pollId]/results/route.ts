/**
 * @swagger
 * /api/vote/{pollId}/results:
 *   get:
 *     summary: 투표 결과 조회
 *     description: |
 *       투표 결과를 집계하여 반환합니다. 재투표 정책에 따라 마지막 투표만 유효합니다.
 *       
 *       **캐싱 전략**:
 *       - 진행 중 투표: 10초 (실시간성 중요)
 *       - 종료된 투표: 5분 (변경 없음)
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
 *         description: 투표 결과 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pollId:
 *                   type: string
 *                   format: uuid
 *                 title:
 *                   type: string
 *                   example: "2025년 학과 회장 선거"
 *                 totalVotes:
 *                   type: integer
 *                   description: 총 유효 투표수 (재투표 정책 적용)
 *                   example: 42
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VoteResult'
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                 note:
 *                   type: string
 *                   example: "DB 캐시 기반. 온체인 이벤트가 원본입니다."
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
import { getValidVotes } from '@/lib/vote-aggregation'

// 동적 라우트로 설정 (정적 경로 생성 방지)
export const dynamic = 'force-dynamic'
export const dynamicParams = true

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

    // 투표 상태에 따른 캐싱 설정
    const now = new Date()
    const isEnded = new Date(poll.endTime) < now
    const cacheSeconds = isEnded ? 300 : 10 // 종료: 5분, 진행 중: 10초

    // 투표 결과 집계
    // Note: 실제로는 온체인 이벤트가 원본, DB는 캐시
    // 재투표 정책: 같은 nullifierHash를 가진 투표 중 가장 최근 것만 집계
    const validVotes = await getValidVotes(pollId)

    // 후보별 득표수 집계
    const results: Record<string, number> = {}
    poll.candidates.forEach((c) => {
      results[c.id] = 0
    })

    validVotes.forEach((vote) => {
      if (vote.candidate !== undefined && vote.candidate !== null) {
        // candidate는 숫자 문자열("0", "1", "2") 또는 후보 ID("opt0", "opt1")일 수 있음
        // 후보 인덱스로 변환 시도
        const candidateIndex = parseInt(vote.candidate, 10)
        
        if (!isNaN(candidateIndex) && candidateIndex >= 0) {
          // 숫자로 변환 가능한 경우: 인덱스로 사용
          const candidateId = poll.candidates[candidateIndex]?.id
          if (candidateId && results[candidateId] !== undefined) {
            results[candidateId]++
          }
        } else {
          // 후보 ID로 직접 사용
          if (results[vote.candidate] !== undefined) {
            results[vote.candidate]++
          }
        }
      }
    })

    // 결과 배열로 변환
    const tallied = poll.candidates.map((c) => ({
      id: c.id,
      label: c.label,
      votes: results[c.id] || 0,
    }))

    // 총 투표수 (유효한 투표만)
    const totalVotes = validVotes.length

    const response = NextResponse.json({
      success: true,
      pollId,
      title: poll.title,
      totalVotes,
      results: tallied,
      updatedAt: new Date(),
      note: 'DB 캐시 기반. 온체인 이벤트가 원본입니다.',
    })

    // 캐싱 헤더 설정
    response.headers.set(
      'Cache-Control',
      `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`
    )

    return response
  } catch (error: unknown) {
    const err = error as { message?: string }
    const { error: logError } = await import('@/lib/logger')
    logError(`[Vote] GET /:pollId/results error:`, err)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '결과 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
