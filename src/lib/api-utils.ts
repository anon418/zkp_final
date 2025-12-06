/**
 * API 유틸리티 함수
 * 
 * 공통 기능:
 * - API URL 구성
 * - 에러 응답 형식
 */

/**
 * API URL 구성
 * 클라이언트에서는 상대 경로, 서버에서는 절대 경로 사용
 */
export function getApiUrl(endpoint: string): string {
  if (typeof window !== 'undefined') {
    // 클라이언트: 상대 경로 사용
    return endpoint
  }
  
  // 서버: 환경 변수 또는 기본값 사용
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  return `${apiUrl}${endpoint}`
}

/**
 * 공통 에러 응답 형식
 */
export interface ApiErrorResponse {
  success: false
  error: string
  message: string
  code?: string
  details?: unknown
  timestamp?: string
}

/**
 * 에러 응답 생성
 */
export function createErrorResponse(
  error: string,
  message: string,
  status: number = 500,
  options?: {
    code?: string
    details?: unknown
  }
): { response: ApiErrorResponse; status: number } {
  return {
    response: {
      success: false,
      error,
      message,
      code: options?.code,
      details: options?.details,
      timestamp: new Date().toISOString(),
    },
    status,
  }
}

/**
 * 공통 성공 응답 형식
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data?: T
  [key: string]: unknown
}

/**
 * 성공 응답 생성
 */
export function createSuccessResponse<T>(
  data?: T,
  additionalFields?: Record<string, unknown>
): ApiSuccessResponse<T> {
  return {
    success: true,
    ...(data !== undefined && { data }),
    ...additionalFields,
  }
}

