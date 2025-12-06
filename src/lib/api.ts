import { ethers } from 'ethers'
import { debug, info, error } from './logger'

// 🔥 Vercel / 로컬 자동 지원
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// ------------------ 타입 정의 ------------------
export interface Candidate {
  id: string
  label: string
}

export interface PollListItem {
  pollId: string
  title: string
  description: string
  createdAt: string
}

export interface PollPublic {
  pollId: string
  title: string
  description: string
  candidates: Candidate[]
  startTime: string
  endTime: string
  isActive: boolean
  status: 'active' | 'upcoming' | 'ended'
}

export interface PollResult {
  pollId: string
  title: string
  totalVotes: number
  results: { candidate: string; count: number }[]
  timestamp: string
}

// ------------------ 공통 Fetch Wrapper ------------------
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  try {
    const url =
      typeof window !== 'undefined'
        ? endpoint // 클라이언트에서는 상대 경로 사용
        : `${API_BASE_URL}${endpoint}` // 서버에서는 절대 경로 사용

    debug(`[API] Fetching: ${url}`)

    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })

    debug(`[API] Response status: ${res.status} for ${endpoint}`)

    const contentType = res.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text()
      error(
        `[API] Non-JSON response from ${endpoint}:`,
        text.substring(0, 200)
      )
      throw new Error(`API가 JSON을 반환하지 않았습니다. (상태: ${res.status})`)
    }

    const body = await res.json()
    debug(`[API] Response body for ${endpoint}:`, body)

    if (res.status >= 400 || body.success === false) {
      const err = new Error(body.message || body.error || 'API Error') as Error & {
        status?: number
        details?: unknown
      }
      err.status = res.status
      err.details = body.details
      throw err
    }

    // API 응답이 { success: true, data: {...} } 또는 { success: true, poll: {...} } 형태
    return body.data || body.poll || body
  } catch (catchError: unknown) {
    const err = catchError as { message?: string }
    error(`[API Fail] ${endpoint}`, err)
    throw catchError
  }
}

// -------------------------------------------------------------
// 📌 투표 목록 (전체 공개) — GET /api/vote?creator=0x...
// -------------------------------------------------------------
export async function getPolls(): Promise<PollListItem[]> {
  return await fetchAPI(`/api/vote`)
}

// -------------------------------------------------------------
// 📌 투표 공개 정보 조회 (유권자 자동 등록 포함)
// GET /api/vote/:pollId/public
// -------------------------------------------------------------
export async function getPollPublic(pollId: string): Promise<PollPublic> {
  try {
    const response = await fetchAPI(`/api/vote/${pollId}/public`)
    debug('[getPollPublic] Raw response:', response)

    // API 응답이 { success: true, poll: {...} } 형태
    if (response.poll) {
      return response.poll
    }

    // 또는 직접 poll 데이터가 반환된 경우
    if (response.pollId) {
      return response
    }

    throw new Error('Invalid API response format')
  } catch (catchError: unknown) {
    const err = catchError as { message?: string }
    error('[getPollPublic] Error:', err)
    throw catchError
  }
}

// -------------------------------------------------------------
// 📌 결과 조회 (차트 / 집계)
// GET /api/vote/:pollId/results
// -------------------------------------------------------------
export async function getPollResults(pollId: string): Promise<PollResult> {
  return await fetchAPI(`/api/vote/${pollId}/results`)
}

// -------------------------------------------------------------
// 📌 투표 생성 — POST /api/vote
// 프론트에서 title, description, candidates 배열만 보냄
// -------------------------------------------------------------
export async function createPoll(payload: {
  title: string
  description: string
  candidates: string[]
}) {
  return await fetchAPI(`/api/vote`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// -------------------------------------------------------------
// 📌 투표 제출 — POST /api/relay
// 실제로는 /api/relay를 직접 사용 (프론트엔드에서 직접 호출)
// -------------------------------------------------------------

// -------------------------------------------------------------
// 📌 투표 삭제 — DELETE /api/vote/:pollId/delete
// -------------------------------------------------------------
export async function deletePoll(pollId: string) {
  return await fetchAPI(`/api/vote/${pollId}/delete`, {
    method: 'DELETE',
  })
}

// -------------------------------------------------------------
// ❌ registerVoter API 사용 없음 (백엔드에서 자동 등록)
// -------------------------------------------------------------
