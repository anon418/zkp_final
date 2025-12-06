/**
 * 공통 에러 핸들러
 * 
 * API 라우트에서 일관된 에러 응답을 생성하기 위한 유틸리티
 */

import { NextResponse } from 'next/server'
import { createErrorResponse } from './api-utils'
import { error as logError } from './logger'

export interface ErrorContext {
  code?: string
  details?: unknown
  statusCode?: number
}

/**
 * 에러 타입별 처리
 */
export class ApiError extends Error {
  constructor(
    public errorCode: string,
    public message: string,
    public statusCode: number = 500,
    public context?: ErrorContext
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Zod 검증 오류 처리
 */
export function handleZodError(err: { name?: string; errors?: unknown }): NextResponse | null {
  if (err.name === 'ZodError') {
    const { response, status } = createErrorResponse(
      'VALIDATION_ERROR',
      '입력 데이터가 올바르지 않습니다.',
      400,
      {
        code: 'VALIDATION_FAILED',
        details: err.errors,
      }
    )
    return NextResponse.json(response, { status })
  }
  return null
}

/**
 * MongoDB 중복 키 오류 처리
 */
export function handleMongoDuplicateError(err: { code?: number }): NextResponse | null {
  if (err.code === 11000) {
    const { response, status } = createErrorResponse(
      'DUPLICATE_ENTRY',
      '이미 존재하는 데이터입니다.',
      409,
      {
        code: 'MONGO_DUPLICATE',
      }
    )
    return NextResponse.json(response, { status })
  }
  return null
}

/**
 * 일반 에러 처리
 */
export function handleGenericError(
  err: unknown,
  defaultMessage: string = '서버 오류가 발생했습니다.'
): NextResponse {
  const error = err as { message?: string; name?: string }
  
  logError('[Error Handler]', error)

  // 이미 ApiError인 경우
  if (error instanceof ApiError) {
    const { response, status } = createErrorResponse(
      error.errorCode,
      error.message,
      error.statusCode,
      error.context
    )
    return NextResponse.json(response, { status })
  }

  // 기타 에러
  const { response, status } = createErrorResponse(
    'INTERNAL_ERROR',
    error.message || defaultMessage,
    500
  )
  return NextResponse.json(response, { status })
}

/**
 * 에러 처리 래퍼
 * API 라우트에서 사용하는 공통 에러 처리
 */
export async function withErrorHandler<T>(
  handler: () => Promise<T>
): Promise<T | NextResponse> {
  try {
    return await handler()
  } catch (err: unknown) {
    // Zod 오류 처리
    const zodResponse = handleZodError(err as { name?: string; errors?: unknown })
    if (zodResponse) return zodResponse

    // MongoDB 중복 키 오류 처리
    const mongoResponse = handleMongoDuplicateError(err as { code?: number })
    if (mongoResponse) return mongoResponse

    // 일반 에러 처리
    return handleGenericError(err)
  }
}

