/**
 * 메트릭 유틸리티 (다른 API에서 사용)
 */

// 간단한 메트릭 저장소 (실제 운영에서는 Redis 등 사용)
interface Metrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  totalProofs: number
  successfulProofs: number
  failedProofs: number
  avgProofTimeMs: number
  totalVotes: number
  totalPolls: number
  uptime: number
  lastUpdate: string
}

let metrics: Metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalProofs: 0,
  successfulProofs: 0,
  failedProofs: 0,
  avgProofTimeMs: 0,
  totalVotes: 0,
  totalPolls: 0,
  uptime: Date.now(),
  lastUpdate: new Date().toISOString(),
}

// 메트릭 업데이트 함수 (다른 API에서 호출)
export function incrementMetric(
  type: 'request' | 'proof' | 'vote' | 'poll',
  success: boolean = true
) {
  if (type === 'request') {
    metrics.totalRequests++
    if (success) metrics.successfulRequests++
    else metrics.failedRequests++
  } else if (type === 'proof') {
    metrics.totalProofs++
    if (success) metrics.successfulProofs++
    else metrics.failedProofs++
  } else if (type === 'vote') {
    metrics.totalVotes++
  } else if (type === 'poll') {
    metrics.totalPolls++
  }
  metrics.lastUpdate = new Date().toISOString()
}

export function getMetrics(): Metrics {
  return { ...metrics }
}

export function resetMetrics() {
  metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalProofs: 0,
    successfulProofs: 0,
    failedProofs: 0,
    avgProofTimeMs: 0,
    totalVotes: 0,
    totalPolls: 0,
    uptime: Date.now(),
    lastUpdate: new Date().toISOString(),
  }
}
