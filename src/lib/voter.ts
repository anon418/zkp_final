/**
 * 👤 투표자 등록 및 신원 관리
 *
 * 역할:
 * - 백엔드에서 투표자 신원(identity) 받기
 * - localStorage에 캐싱 (재사용)
 * - ZKP 증명 생성 시 필요한 secret 제공
 *
 * 주요 함수:
 * - ensureRegistered() - 신원 등록/조회
 * - getStoredIdentity() - 로컬 캐시 조회
 */

import { debug, warn, error as logError } from './logger'

export type IdentityPayload = {
  identityNullifier: string // ZKP nullifier 생성용
  identityTrapdoor: string // ZKP commitment 생성용
  [k: string]: unknown // 백엔드 추가 필드
}

const CACHE_KEY_PREFIX = 'voter_identity_'

/**
 * 백엔드 API URL 가져오기
 * 클라이언트에서는 항상 상대 경로 사용 (같은 도메인)
 */
const getRegisterUrl = () => {
  // 클라이언트에서는 항상 상대 경로 사용
  if (typeof window !== 'undefined') {
    return '/api/voter/register'
  }
  // 서버 사이드에서는 환경 변수 사용
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
  return apiUrl ? `${apiUrl}/api/voter/register` : '/api/voter/register'
}

/**
 * 로컬 캐시에서 identity 불러오기
 */
export function getStoredIdentity(address: string): IdentityPayload | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${address}`)
    if (!raw) return null
    return JSON.parse(raw) as IdentityPayload
  } catch (e) {
    warn('Stored identity parse failed', e)
    return null
  }
}

/**
 * identity 저장 (localStorage)
 */
export function storeIdentity(address: string, identity: IdentityPayload) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(
      `${CACHE_KEY_PREFIX}${address}`,
      JSON.stringify(identity)
    )
  } catch (e) {
    warn('Failed to store identity', e)
  }
}

/**
 * 투표자 등록 보장 (캐시 우선)
 *
 * 동작 방식:
 * 1. localStorage 확인 → 있으면 즉시 반환
 * 2. 없으면 백엔드 POST /voter/register 호출
 * 3. 응답 받은 identity를 localStorage에 저장
 *
 * @param address 지갑 주소
 * @param forceRefresh 강제 갱신 여부
 * @returns { identityNullifier, identityTrapdoor }
 */
export async function ensureRegistered(
  address: string,
  forceRefresh = false
): Promise<IdentityPayload> {
  if (!address) throw new Error('address is required')

  // 이미 있으면 재사용
  const cached = !forceRefresh ? getStoredIdentity(address) : null
  if (cached) return cached

  // 새로 백엔드에 등록 요청
  const registerUrl = getRegisterUrl()
  debug('[Voter] Register URL:', registerUrl)
  debug('[Voter] Register address:', address)

  let res: Response
  try {
    res = await fetch(registerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    })
    debug('[Voter] Register response status:', res.status)
  } catch (err: unknown) {
    const error = err as { message?: string }
    logError('[Voter] Network error:', error)
    throw new Error(`Network error: ${error.message || 'Unknown error'}`)
  }

  // Content-Type 확인
  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  if (!res.ok) {
    let errorText = ''

    if (isJson) {
      try {
        const errorJson = await res.json()
        errorText =
          errorJson.message || errorJson.error || JSON.stringify(errorJson)
      } catch (parseError) {
        logError('[Voter] JSON parse error:', parseError)
        errorText = `Status ${res.status}`
      }
    } else {
      const text = await res.text().catch(() => '')
      // HTML 응답인 경우 (404 페이지 등) 첫 200자만 표시
      errorText = text.length > 200 ? text.substring(0, 200) + '...' : text
    }

    logError('[Voter] Register failed:', {
      status: res.status,
      statusText: res.statusText,
      url: registerUrl,
      contentType,
      error: errorText,
    })

    throw new Error(`voter/register failed (${res.status}): ${errorText}`)
  }

  // 성공 응답 처리
  if (!isJson) {
    const text = await res.text().catch(() => '')
    logError('[Voter] Non-JSON success response:', {
      status: res.status,
      contentType,
      text: text.substring(0, 200),
    })
    throw new Error(
      `voter/register returned non-JSON response (${res.status}): ${contentType}`
    )
  }

  let json: IdentityPayload
  try {
    json = (await res.json()) as IdentityPayload
  } catch (parseError) {
    logError('[Voter] JSON parse error on success response:', parseError)
    throw new Error('Failed to parse voter/register response as JSON')
  }

  // 백엔드 응답 검증
  if (!json.identityNullifier || !json.identityTrapdoor) {
    warn('⚠ Unexpected voter/register response:', json)
  }

  // 저장
  storeIdentity(address, json)

  return json
}
