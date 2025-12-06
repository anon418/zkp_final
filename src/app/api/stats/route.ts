/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: 전체 통계 조회
 *     description: |
 *       시스템 전체 통계를 조회합니다.
 *
 *       **캐싱**: 1분 (60초) - 통계는 자주 변경되지 않으므로 캐싱 적용
 *
 *       포함 통계:
 *       - 전체 투표 수
 *       - 전체 참여 수
 *       - 진행 중/종료된 투표 수
 *       - 오늘 생성된 투표/참여 수
 *       - 인기 투표 Top 5
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: 통계 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalPolls:
 *                       type: integer
 *                       description: 전체 투표 수
 *                       example: 42
 *                     totalVotes:
 *                       type: integer
 *                       description: 전체 참여 수
 *                       example: 1234
 *                     activePolls:
 *                       type: integer
 *                       description: 진행 중인 투표 수
 *                       example: 5
 *                     endedPolls:
 *                       type: integer
 *                       description: 종료된 투표 수
 *                       example: 37
 *                     todayPolls:
 *                       type: integer
 *                       description: 오늘 생성된 투표 수
 *                       example: 3
 *                     todayVotes:
 *                       type: integer
 *                       description: 오늘 참여 수
 *                       example: 56
 *                     topPolls:
 *                       type: array
 *                       description: 인기 투표 Top 5
 *                       items:
 *                         type: object
 *                         properties:
 *                           pollId:
 *                             type: string
 *                             format: uuid
 *                           title:
 *                             type: string
 *                           voteCount:
 *                             type: integer
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "INTERNAL_ERROR"
 */

import { NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import Poll from '@/models/Poll'
import Vote from '@/models/Vote'

export const revalidate = 60 // 1분 캐시

export async function GET() {
  try {
    await dbConnect()

    const now = new Date()
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    )

    // 전체 투표 수
    const totalPolls = await Poll.countDocuments()

    // 전체 참여 수
    const totalVotes = await Vote.countDocuments()

    // 진행 중 투표
    const activePolls = await Poll.countDocuments({
      startTime: { $lte: now },
      endTime: { $gte: now },
    })

    // 종료된 투표
    const endedPolls = await Poll.countDocuments({
      endTime: { $lt: now },
    })

    // 오늘 생성된 투표
    const todayPolls = await Poll.countDocuments({
      createdAt: { $gte: todayStart },
    })

    // 오늘 참여 수
    const todayVotes = await Vote.countDocuments({
      createdAt: { $gte: todayStart },
    })

    // 인기 투표 Top 5
    // 삭제된 투표는 통계에서 제외 (Poll이 존재하는 것만 집계)
    interface VoteAggregationResult {
      _id: string
      count: number
    }

    interface TopPollResult {
      pollId: string
      title: string
      voteCount: number
    }

    const voteAggregation = (await Vote.aggregate([
      { $group: { _id: '$pollId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])) as VoteAggregationResult[]

    const topPollIds = voteAggregation.map((v) => v._id)
    const topPollsData = await Poll.find({
      pollId: { $in: topPollIds },
    }).select('pollId title')

    // 삭제된 투표는 필터링 (Poll이 존재하는 것만 반환)
    const topPolls: TopPollResult[] = voteAggregation
      .map((v) => {
        const poll = topPollsData.find((p) => p.pollId === v._id)
        if (!poll) return null // 삭제된 투표는 null 반환
        return {
          pollId: v._id,
          title: poll.title,
          voteCount: v.count,
        }
      })
      .filter((p): p is TopPollResult => p !== null) // null 제거 및 타입 가드

    const response = NextResponse.json({
      success: true,
      stats: {
        totalPolls,
        totalVotes,
        activePolls,
        endedPolls,
        todayPolls,
        todayVotes,
        topPolls,
      },
    })

    // 캐싱 헤더 설정 (1분)
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=120'
    )

    return response
  } catch (error: unknown) {
    const err = error as { message?: string }
    const { error: logError } = await import('@/lib/logger')
    logError('[Stats] GET error:', err)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
