/**
 * pollId 타입 변환 유틸리티
 *
 * 백엔드에서는 UUID 문자열을 사용하지만,
 * 블록체인 컨트랙트에서는 uint256을 사용합니다.
 *
 * 이 모듈은 UUID ↔ uint256 변환을 제공합니다.
 */

import { ethers } from 'ethers'

/**
 * UUID 문자열을 uint256 (BigInt)로 변환
 *
 * 변환 방법: UUID 문자열을 해시하고, 256비트 범위로 모듈로 연산
 *
 * @param uuid - UUID v4 문자열 (예: "550e8400-e29b-41d4-a716-446655440000")
 * @returns uint256 (BigInt)
 *
 * @example
 * const pollIdNumber = uuidToPollId("550e8400-e29b-41d4-a716-446655440000");
 * // → 1234567890123456789012345678901234567890n
 */
export function uuidToPollId(uuid: string): bigint {
  if (!uuid || typeof uuid !== 'string') {
    throw new Error('UUID must be a non-empty string')
  }

  // UUID 문자열을 바이트로 변환
  const uuidBytes = ethers.toUtf8Bytes(uuid)

  // Keccak256 해시 계산
  const hash = ethers.keccak256(uuidBytes)

  // uint256 범위로 변환 (BigInt)
  return BigInt(hash)
}

/**
 * uint256 (BigInt)를 문자열로 변환
 *
 * @param pollIdNumber - uint256 (BigInt)
 * @returns 문자열 표현
 *
 * @example
 * const pollIdString = pollIdToString(1234567890123456789012345678901234567890n);
 * // → "1234567890123456789012345678901234567890"
 */
export function pollIdToString(pollIdNumber: bigint): string {
  return pollIdNumber.toString()
}

/**
 * uint256 (문자열 또는 BigInt)를 UUID로 복원 시도
 *
 * 주의: 해시는 일방향 함수이므로 완전한 복원은 불가능합니다.
 * 이 함수는 변환 가능한 형식을 확인하는 데 사용됩니다.
 *
 * @param pollIdNumber - uint256 (BigInt 또는 문자열)
 * @returns 변환된 값 (UUID로 복원은 불가능, 확인용)
 */
export function pollIdToUuid(pollIdNumber: bigint | string): string {
  const num =
    typeof pollIdNumber === 'string' ? BigInt(pollIdNumber) : pollIdNumber
  return `poll-${pollIdToString(num).slice(0, 16)}`
}

/**
 * 두 pollId (UUID와 uint256)가 같은 투표를 가리키는지 확인
 *
 * @param uuid - UUID 문자열
 * @param pollIdNumber - uint256 (BigInt 또는 문자열)
 * @returns 일치 여부
 */
export function isSamePoll(
  uuid: string,
  pollIdNumber: bigint | string
): boolean {
  try {
    const converted = uuidToPollId(uuid)
    const num =
      typeof pollIdNumber === 'string' ? BigInt(pollIdNumber) : pollIdNumber
    return converted === num
  } catch (error) {
    console.error('Error comparing pollIds:', error)
    return false
  }
}

/**
 * 컨트랙트 호출용 pollId 포맷 (uint256)
 *
 * 컨트랙트의 public signals에서 pollId는 uint256입니다.
 *
 * @param uuid - UUID 문자열
 * @returns 컨트랙트 호출용 pollId (문자열)
 */
export function getContractPollId(uuid: string): string {
  return pollIdToString(uuidToPollId(uuid))
}
