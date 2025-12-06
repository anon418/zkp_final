/**
 * @swagger
 * /api/metrics:
 *   get:
 *     summary: 시스템 메트릭스 조회
 *     description: |
 *       시스템 성능 및 사용 통계를 조회합니다.
 *
 *       **지원 형식**:
 *       - JSON: 기본 형식 (기본값)
 *       - Prometheus: Prometheus 형식으로 내보내기
 *
 *       **포함 메트릭스**:
 *       - API 요청 수 (성공/실패)
 *       - ZKP 증명 생성 수 (성공/실패)
 *       - 투표 수
 *       - 투표 생성 수
 *       - 평균 증명 생성 시간
 *       - 서비스 업타임
 *     tags: [Metrics]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, prometheus]
 *           default: json
 *         description: 메트릭스 형식
 *       - in: query
 *         name: reset
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 메트릭스 초기화 여부 (주의: 모든 통계가 리셋됨)
 *     responses:
 *       200:
 *         description: 메트릭스 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRequests:
 *                   type: integer
 *                   description: 전체 API 요청 수
 *                 successfulRequests:
 *                   type: integer
 *                   description: 성공한 요청 수
 *                 failedRequests:
 *                   type: integer
 *                   description: 실패한 요청 수
 *                 totalProofs:
 *                   type: integer
 *                   description: 전체 ZKP 증명 생성 시도 수
 *                 successfulProofs:
 *                   type: integer
 *                   description: 성공한 증명 생성 수
 *                 failedProofs:
 *                   type: integer
 *                   description: 실패한 증명 생성 수
 *                 totalVotes:
 *                   type: integer
 *                   description: 전체 투표 수
 *                 totalPolls:
 *                   type: integer
 *                   description: 전체 투표 생성 수
 *                 avgProofTimeMs:
 *                   type: number
 *                   description: 평균 증명 생성 시간 (밀리초)
 *                 uptime:
 *                   type: integer
 *                   description: 서비스 시작 시간 (Unix timestamp)
 *                 successRate:
 *                   type: string
 *                   description: API 성공률 (%)
 *                 proofSuccessRate:
 *                   type: string
 *                   description: 증명 생성 성공률 (%)
 *           text/plain:
 *             schema:
 *               type: string
 *               description: Prometheus 형식 메트릭스
 *               example: |
 *                 # HELP zkp_voting_requests_total Total number of API requests
 *                 zkp_voting_requests_total{status="success"} 100
 *                 zkp_voting_requests_total{status="failed"} 5
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMetrics, resetMetrics } from '@/lib/metrics'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json' // json or prometheus

    const metrics = getMetrics()
    const uptimeSeconds = Math.floor((Date.now() - metrics.uptime) / 1000)
    const successRate =
      metrics.totalRequests > 0
        ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(
            2
          )
        : '0'
    const proofSuccessRate =
      metrics.totalProofs > 0
        ? ((metrics.successfulProofs / metrics.totalProofs) * 100).toFixed(2)
        : '0'

    if (format === 'prometheus') {
      // Prometheus 포맷
      const prometheusText = `
# HELP zkp_voting_requests_total Total number of API requests
# TYPE zkp_voting_requests_total counter
zkp_voting_requests_total{status="success"} ${metrics.successfulRequests}
zkp_voting_requests_total{status="failed"} ${metrics.failedRequests}

# HELP zkp_voting_proofs_total Total number of ZKP proofs generated
# TYPE zkp_voting_proofs_total counter
zkp_voting_proofs_total{status="success"} ${metrics.successfulProofs}
zkp_voting_proofs_total{status="failed"} ${metrics.failedProofs}

# HELP zkp_voting_votes_total Total number of votes cast
# TYPE zkp_voting_votes_total counter
zkp_voting_votes_total ${metrics.totalVotes}

# HELP zkp_voting_polls_total Total number of polls created
# TYPE zkp_voting_polls_total counter
zkp_voting_polls_total ${metrics.totalPolls}

# HELP zkp_voting_proof_duration_ms Average proof generation time in milliseconds
# TYPE zkp_voting_proof_duration_ms gauge
zkp_voting_proof_duration_ms ${metrics.avgProofTimeMs}

# HELP zkp_voting_uptime_seconds Uptime in seconds
# TYPE zkp_voting_uptime_seconds counter
zkp_voting_uptime_seconds ${uptimeSeconds}
`.trim()

      return new NextResponse(prometheusText, {
        headers: { 'Content-Type': 'text/plain; version=0.0.4' },
      })
    } else {
      // JSON 포맷 (기본)
      return NextResponse.json({
        success: true,
        metrics: {
          requests: {
            total: metrics.totalRequests,
            successful: metrics.successfulRequests,
            failed: metrics.failedRequests,
            successRate: `${successRate}%`,
          },
          proofs: {
            total: metrics.totalProofs,
            successful: metrics.successfulProofs,
            failed: metrics.failedProofs,
            successRate: `${proofSuccessRate}%`,
            avgTimeMs: metrics.avgProofTimeMs,
          },
          data: {
            totalVotes: metrics.totalVotes,
            totalPolls: metrics.totalPolls,
          },
          system: {
            uptimeSeconds,
            uptimeHuman: formatUptime(uptimeSeconds),
            lastUpdate: metrics.lastUpdate,
          },
        },
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    const { error: logError } = await import('@/lib/logger')
    logError('[Metrics] GET error:', err)
    return NextResponse.json(
      {
        success: false,
        error: 'METRICS_ERROR',
        message: '메트릭 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

// Uptime을 읽기 쉬운 형식으로 변환
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(' ')
}

// 메트릭 리셋 (관리자용, 보안 토큰 필요)
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.ADMIN_TOKEN || 'dev-token-change-me'

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: '인증 실패' },
        { status: 401 }
      )
    }

    // 메트릭 리셋
    resetMetrics()

    return NextResponse.json({
      success: true,
      message: '메트릭이 리셋되었습니다.',
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    const { error: logError } = await import('@/lib/logger')
    logError('[Metrics] DELETE error:', err)
    return NextResponse.json(
      { success: false, error: 'RESET_ERROR', message: '메트릭 리셋 실패' },
      { status: 500 }
    )
  }
}
