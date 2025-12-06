/**
 * @swagger
 * /api/vote/{pollId}/export:
 *   get:
 *     summary: 투표 결과 내보내기
 *     description: |
 *       투표 결과를 CSV 또는 JSON 형식으로 내보냅니다.
 *       
 *       - 진행 중 투표: 현재까지의 결과
 *       - 종료된 투표: 최종 결과
 *       - 재투표 정책 반영: 마지막 투표만 집계
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
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *         description: 내보내기 형식
 *     responses:
 *       200:
 *         description: 내보내기 성공
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               example: "투표 제목,2025년 학과 회장 선거\n..."
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 poll:
 *                   type: object
 *                 results:
 *                   type: object
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
import { createErrorResponse } from '@/lib/api-utils'
import { withErrorHandler } from '@/lib/error-handler'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  return withErrorHandler(async () => {
    const { pollId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv' // csv or json

    // DB 연결
    await dbConnect()

    // Poll 조회
    const poll = await Poll.findOne({ pollId })

    if (!poll) {
      const { response, status } = createErrorResponse(
        'POLL_NOT_FOUND',
        '투표를 찾을 수 없습니다.',
        404,
        { code: 'POLL_NOT_FOUND' }
      )
      return NextResponse.json(response, { status })
    }

    // 투표 상태 확인
    const now = new Date()
    const isEnded = new Date(poll.endTime) < now
    const statusText = isEnded ? '종료됨' : '진행 중'

    // 투표 결과 집계 (재투표 정책: 마지막 투표만 유효)
    const validVotes = await getValidVotes(pollId)
    const candidateVotes: Record<string, number> = {}

    // 초기화
    poll.candidates.forEach((c) => {
      candidateVotes[c.label] = 0
    })

    // 집계
    validVotes.forEach((vote) => {
      if (vote.candidate !== undefined && vote.candidate !== null) {
        const candidateIndex = parseInt(vote.candidate, 10)
        
        if (!isNaN(candidateIndex) && candidateIndex >= 0) {
          // 숫자로 변환 가능한 경우: 인덱스로 사용
          const candidateLabel = poll.candidates[candidateIndex]?.label
          if (candidateLabel && candidateVotes[candidateLabel] !== undefined) {
            candidateVotes[candidateLabel]++
          }
        } else if (vote.candidate) {
          // 후보 ID로 직접 사용
          const candidate = poll.candidates.find((c) => c.id === vote.candidate)
          if (candidate && candidateVotes[candidate.label] !== undefined) {
            candidateVotes[candidate.label]++
          }
        }
      }
    })

    if (format === 'csv') {
      // CSV 생성
      const rows = [
        ['투표 제목', poll.title],
        ['투표 설명', poll.description || ''],
        ['상태', statusText],
        ['생성일', new Date(poll.createdAt).toLocaleString('ko-KR')],
        ['시작 시간', new Date(poll.startTime).toLocaleString('ko-KR')],
        ['종료 시간', new Date(poll.endTime).toLocaleString('ko-KR')],
        ['내보내기 시각', new Date().toLocaleString('ko-KR')],
        ['총 투표수', validVotes.length.toString()],
        [],
        ['후보', '득표수', '득표율'],
      ]

      Object.entries(candidateVotes).forEach(([candidate, count]) => {
        const percentage =
          validVotes.length > 0 ? ((count / validVotes.length) * 100).toFixed(1) : '0.0'
        rows.push([candidate, count.toString(), `${percentage}%`])
      })

      const csv = rows.map((row) => row.join(',')).join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="poll-${pollId}-results.csv"`,
        },
      })
    } else {
      // JSON 형식
      return NextResponse.json({
        success: true,
        poll: {
          pollId: poll.pollId,
          title: poll.title,
          description: poll.description,
          status: statusText,
          createdAt: poll.createdAt,
          startTime: poll.startTime,
          endTime: poll.endTime,
          exportedAt: new Date(),
        },
        results: {
          totalVotes: validVotes.length,
          candidates: Object.entries(candidateVotes).map(
            ([candidate, count]) => ({
              candidate,
              votes: count,
              percentage:
                validVotes.length > 0
                  ? ((count / validVotes.length) * 100).toFixed(1)
                  : '0.0',
            })
          ),
        },
      })
    }
  }) as Promise<NextResponse>
}
