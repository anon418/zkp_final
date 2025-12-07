/**
 * 전역 미들웨어
 *
 * 모든 API 요청에 적용되는 공통 로직:
 * 1. CORS 처리 (프론트엔드와의 통신 허용)
 * 2. RateLimit (DDoS 방지) - 익명성 보장을 위해 IP 해시 사용
 *
 * ⚠️ 익명성 보장 정책:
 * - IP 주소는 직접 저장하지 않고 해시만 저장
 * - RequestID는 민감한 API(/api/relay)에서는 로깅하지 않음
 * - RateLimit은 환경 변수로 제어 가능
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

// ============================================
// 1. RateLimit 설정
// ============================================
// IP당 15분 동안 최대 100회 요청 허용
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100', 10)
const RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || '900000',
  10
) // 15분 (900,000ms)
const ENABLE_RATE_LIMIT = process.env.ENABLE_RATE_LIMIT !== 'false' // 기본값: true

// 메모리 기반 캐시 (개발 환경용)
// 프로덕션에서는 Redis 사용 권장
// ⚠️ 익명성 보장: IP 해시만 저장 (원본 IP는 저장하지 않음)
const rateLimitCache = new Map<string, { count: number; resetTime: number }>()

/**
 * IP 주소를 해시로 변환 (익명성 보장)
 *
 * 원본 IP 주소를 직접 저장하지 않고 SHA-256 해시만 저장합니다.
 * 이를 통해 RateLimit은 유지하되 익명성을 보장합니다.
 *
 * @param ip 원본 IP 주소
 * @returns IP 해시 (16자리)
 */
function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').substring(0, 16)
}

/**
 * 클라이언트 IP 주소 추출 및 해시화
 *
 * 프록시나 로드밸런서를 거친 경우 실제 클라이언트 IP를 찾기 위해
 * 여러 헤더를 확인합니다. 익명성을 위해 해시만 반환합니다.
 */
function getClientIpHash(req: NextRequest): string | null {
  // x-forwarded-for: 프록시를 거친 경우 원본 IP가 여기에 있음
  const xff =
    req.headers.get('x-forwarded-for') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-vercel-forwarded-for')
  if (!xff) return null
  // 여러 IP가 있을 수 있으므로 첫 번째 IP만 사용
  const ip = xff.split(',')[0].trim()
  // 익명성 보장: IP를 해시로 변환
  return hashIp(ip)
}

// ============================================
// 2. CORS 허용 출처 설정
// ============================================
// 환경 변수에서 허용할 출처를 가져옴 (쉼표로 구분)
const envOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : []

// 기본 허용 출처 (개발 환경)
const allowedOrigins = [
  'http://localhost:3000', // Next.js 기본 포트
  'http://localhost:3001', // 대체 포트
  ...envOrigins, // 환경 변수에서 추가된 출처
]

/**
 * RateLimit 적용 함수
 *
 * IP 해시별로 요청 횟수를 추적하고, 제한을 초과하면 true를 반환합니다.
 *
 * ⚠️ 익명성 보장: IP 해시만 사용 (원본 IP는 저장하지 않음)
 *
 * @param ipHash IP 해시 (16자리)
 * @returns true: 제한 초과, false: 허용
 */
function applyRateLimit(ipHash: string): boolean {
  const now = Date.now()

  // 캐시에 IP 해시가 없으면 초기화 (첫 요청)
  if (!rateLimitCache.has(ipHash)) {
    rateLimitCache.set(ipHash, {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW_MS, // 15분 후 리셋
    })
  }

  const cache = rateLimitCache.get(ipHash)!

  // 시간 윈도우가 지났으면 카운트 리셋
  if (cache.resetTime < now) {
    cache.count = 0
    cache.resetTime = now + RATE_LIMIT_WINDOW_MS
  }

  // 요청 횟수 증가
  cache.count += 1

  // 제한 초과 여부 반환
  return cache.count > RATE_LIMIT_MAX
}

/**
 * Next.js 미들웨어 함수
 *
 * 모든 요청에 대해 다음을 수행합니다:
 * 1. RequestID 생성 (익명성 보장: 민감한 API에서는 로깅하지 않음)
 * 2. CORS 헤더 설정
 * 3. OPTIONS 요청 처리 (Preflight)
 * 4. RateLimit 적용 (API 경로만, IP 해시 사용)
 *
 * ⚠️ OpenTelemetry 에러 방지: Node.js Runtime 사용
 * ⚠️ 익명성 보장: IP 주소는 해시만 저장, /api/relay는 로깅하지 않음
 */
export const runtime = 'nodejs' // ✅ Edge Runtime 대신 Node.js Runtime 사용

// 민감한 API 경로 (익명성 보장을 위해 로깅하지 않음)
const SENSITIVE_PATHS = ['/api/relay']

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const origin = request.headers.get('origin')
  const response = NextResponse.next()

  // ============================================
  // 1. RequestID 생성 및 설정
  // ============================================
  // 모든 요청에 고유 ID를 부여 (디버깅용)
  // ⚠️ 익명성 보장: 민감한 API(/api/relay)에서는 로깅하지 않음
  const requestId = globalThis.crypto.randomUUID()
  request.headers.set('X-Request-ID', requestId)
  response.headers.set('X-Request-ID', requestId)

  // 익명성 보장: 민감한 API 경로는 로깅하지 않음
  const isSensitivePath = SENSITIVE_PATHS.some((path) =>
    url.pathname.startsWith(path)
  )
  if (!isSensitivePath) {
    console.log(`[RequestID: ${requestId}] ${request.method} ${url.pathname}`)
  }

  // ============================================
  // 2. CORS 처리
  // ============================================
  // 허용된 출처에서 온 요청에만 CORS 헤더 추가
  if ((origin && allowedOrigins.includes(origin)) || !origin) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,DELETE,OPTIONS'
    )
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Request-ID'
    )
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  // ============================================
  // 3. OPTIONS 요청 처리 (Preflight)
  // ============================================
  // 브라우저가 실제 요청 전에 보내는 사전 요청 처리
  if (request.method === 'OPTIONS') {
    if ((origin && allowedOrigins.includes(origin)) || !origin) {
      const preflight = new Response(null, { status: 204 }) // No Content
      preflight.headers.set('Access-Control-Allow-Origin', origin || '*')
      preflight.headers.set(
        'Access-Control-Allow-Methods',
        'GET,POST,PUT,DELETE,OPTIONS'
      )
      preflight.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Request-ID'
      )
      preflight.headers.set('Access-Control-Allow-Credentials', 'true')
      return preflight
    }
    return new Response('Not Allowed', { status: 403 })
  }

  // ============================================
  // 4. RateLimit 적용 (API 경로만)
  // ============================================
  // /api로 시작하는 경로에만 RateLimit 적용
  // ⚠️ 익명성 보장: IP 해시만 사용 (원본 IP는 저장하지 않음)
  if (ENABLE_RATE_LIMIT && url.pathname.startsWith('/api')) {
    const ipHash = getClientIpHash(request) ?? 'anonymous'
    if (applyRateLimit(ipHash)) {
      // 제한 초과 시 429 Too Many Requests 반환
      return new Response(
        JSON.stringify({
          success: false,
          message: '요청 속도가 너무 빠릅니다. 잠시 후 다시 시도해 주세요.',
          requestId: isSensitivePath ? undefined : requestId, // 민감한 경로는 RequestID도 숨김
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitCache.get(ipHash)!.resetTime),
            ...(isSensitivePath ? {} : { 'X-Request-ID': requestId }), // 민감한 경로는 RequestID도 숨김
          },
        }
      )
    }
  }

  return response
}

// ============================================
// 5. 미들웨어 적용 경로 설정
// ============================================
// API 경로에만 미들웨어 적용 (Edge Runtime 호환)
export const config = {
  matcher: [
    '/api/:path*',
    // /_next/static, /_next/image 등은 제외
  ],
}
