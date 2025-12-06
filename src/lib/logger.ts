/**
 * 로깅 유틸리티
 * 
 * 환경 변수에 따라 로깅 레벨을 제어합니다.
 * 프로덕션에서는 중요한 로그만 출력합니다.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// 환경 변수에서 로그 레벨 가져오기 (기본값: 개발=debug, 프로덕션=warn)
const getLogLevel = (): LogLevel => {
  if (typeof window !== 'undefined') {
    // 클라이언트 사이드
    const envLevel = process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel
    if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
      return envLevel
    }
    return process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
  } else {
    // 서버 사이드
    const envLevel = process.env.LOG_LEVEL as LogLevel
    if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
      return envLevel
    }
    return process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
  }
}

const currentLogLevel = getLogLevel()
const minLevel = LOG_LEVELS[currentLogLevel]

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= minLevel
}

/**
 * 디버그 로그 (개발 환경에서만)
 */
export const debug = (...args: unknown[]): void => {
  if (shouldLog('debug')) {
    console.log('[DEBUG]', ...args)
  }
}

/**
 * 정보 로그
 */
export const info = (...args: unknown[]): void => {
  if (shouldLog('info')) {
    console.log('[INFO]', ...args)
  }
}

/**
 * 경고 로그
 */
export const warn = (...args: unknown[]): void => {
  if (shouldLog('warn')) {
    console.warn('[WARN]', ...args)
  }
}

/**
 * 에러 로그 (항상 출력)
 */
export const error = (...args: unknown[]): void => {
  if (shouldLog('error')) {
    console.error('[ERROR]', ...args)
  }
}

/**
 * 그룹 로그 (개발 환경에서만)
 */
export const group = (label: string): void => {
  if (shouldLog('debug') && console.group) {
    console.group(label)
  }
}

export const groupEnd = (): void => {
  if (shouldLog('debug') && console.groupEnd) {
    console.groupEnd()
  }
}

/**
 * 현재 로그 레벨 반환
 */
export const getCurrentLogLevel = (): LogLevel => {
  return currentLogLevel
}

