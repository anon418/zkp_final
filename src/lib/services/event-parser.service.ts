/**
 * 트랜잭션 이벤트 파싱 서비스
 * 
 * @description
 * 블록체인 트랜잭션 receipt에서 VoteCast 이벤트를 파싱하여 isUpdate 값을 추출합니다.
 */

import { ethers } from 'ethers'
import { VOTING_V2_ABI, VOTING_V2_ADDRESS } from '@/lib/contractsV2'
import { debug, warn } from '@/lib/logger'

export interface ParseVoteCastEventParams {
  txReceipt: ethers.TransactionReceipt | null
  txHash: string
  contractAddress?: string
  contractABI?: ethers.InterfaceAbi
  provider: ethers.Provider
  pollIdNumeric: number
  publicSignals: string[]
}

export interface ParseVoteCastEventResult {
  isUpdate: boolean | null
  pollId: string | null
  nullifier: string | null
  candidate: number | null
}

/**
 * 트랜잭션 receipt에서 VoteCast 이벤트를 파싱하여 isUpdate 값을 추출합니다.
 */
export function parseVoteCastEvent(
  params: ParseVoteCastEventParams
): ParseVoteCastEventResult {
  const {
    txReceipt,
    txHash,
    contractAddress = VOTING_V2_ADDRESS,
    contractABI = VOTING_V2_ABI,
    provider,
    pollIdNumeric,
    publicSignals,
  } = params

  let isUpdateFromEvent: boolean | null = null
  let eventPollId: string | null = null
  let eventNullifier: string | null = null
  let eventCandidate: number | null = null

  try {
    // Receipt가 있고 logs가 있을 때만 이벤트 파싱
    if (txReceipt && txReceipt.logs && txReceipt.logs.length > 0) {
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        provider
      )
      const voteCastEvent = contract.interface.getEvent('VoteCast')

      // 이벤트가 존재하는지 확인
      if (voteCastEvent) {
        const eventTopic = voteCastEvent.topicHash
        debug(`[EventParser] VoteCast 이벤트 토픽: ${eventTopic}`)
        debug(`[EventParser] 트랜잭션 로그 수: ${txReceipt.logs.length}`)

        // 트랜잭션 receipt의 logs에서 VoteCast 이벤트 찾기
        for (let i = 0; i < txReceipt.logs.length; i++) {
          const log = txReceipt.logs[i]
          debug(
            `[EventParser] 로그 ${i}: address=${log.address}, topics[0]=${log.topics[0]}`
          )

          // 컨트랙트 주소와 이벤트 토픽 확인
          if (
            log.address.toLowerCase() === contractAddress.toLowerCase() &&
            log.topics[0] === eventTopic
          ) {
            debug(
              `[EventParser] VoteCast 이벤트 매칭! 로그 ${i}에서 파싱 시도...`
            )
            try {
              // parseLog를 사용하여 더 안전하게 파싱
              const parsed = contract.interface.parseLog({
                topics: log.topics as string[],
                data: log.data,
              })

              if (parsed && parsed.name === 'VoteCast') {
                // isUpdate 값 추출 (여러 방법 시도)
                const isUpdateValue = parsed.args.isUpdate
                debug(
                  `[EventParser] parsed.args.isUpdate 원본: ${isUpdateValue}, 타입: ${typeof isUpdateValue}`
                )

                // boolean, number(0/1), string("true"/"false") 등 다양한 형식 처리
                if (typeof isUpdateValue === 'boolean') {
                  isUpdateFromEvent = isUpdateValue
                } else if (typeof isUpdateValue === 'number') {
                  isUpdateFromEvent = isUpdateValue !== 0
                } else if (typeof isUpdateValue === 'string') {
                  isUpdateFromEvent =
                    isUpdateValue.toLowerCase() === 'true' ||
                    isUpdateValue === '1'
                } else if (
                  isUpdateValue !== null &&
                  isUpdateValue !== undefined
                ) {
                  // BigInt 등 다른 타입도 boolean으로 변환
                  isUpdateFromEvent = Boolean(isUpdateValue)
                }

                debug(
                  `[EventParser] ✅ VoteCast 이벤트에서 isUpdate 파싱 성공: ${isUpdateFromEvent} (원본 값: ${isUpdateValue}, 타입: ${typeof isUpdateValue})`
                )

                // 이벤트 데이터 추출
                eventPollId = parsed.args.pollId?.toString() || null
                eventNullifier = parsed.args.nullifier?.toString() || null
                eventCandidate =
                  typeof parsed.args.candidate === 'number'
                    ? parsed.args.candidate
                    : typeof parsed.args.candidate === 'bigint'
                      ? Number(parsed.args.candidate)
                      : null

                // 디버깅: 이벤트에서 추출한 nullifier와 publicSignals의 nullifier 비교
                const eventNullifierStr = eventNullifier || 'N/A'
                const publicSignalsNullifierStr =
                  publicSignals[2]?.toString() || 'N/A'

                debug(
                  `[EventParser] ========== 이벤트 nullifier vs publicSignals nullifier ==========`
                )
                debug(
                  `[EventParser] 이벤트 nullifier: ${eventNullifierStr.substring(
                    0,
                    50
                  )}... (타입: ${typeof parsed.args.nullifier})`
                )
                debug(
                  `[EventParser] publicSignals[2]: ${publicSignalsNullifierStr.substring(
                    0,
                    50
                  )}... (타입: ${typeof publicSignals[2]})`
                )

                // nullifier 값 비교
                try {
                  const eventNullifierBigInt =
                    typeof parsed.args.nullifier === 'bigint'
                      ? parsed.args.nullifier
                      : BigInt(parsed.args.nullifier?.toString() || '0')
                  const publicSignalsNullifierBigInt =
                    typeof publicSignals[2] === 'bigint'
                      ? publicSignals[2]
                      : BigInt(publicSignals[2]?.toString() || '0')

                  const nullifiersMatch =
                    eventNullifierBigInt === publicSignalsNullifierBigInt
                  debug(`[EventParser] nullifier 일치 여부: ${nullifiersMatch}`)
                  if (!nullifiersMatch) {
                    warn(
                      `[EventParser] ⚠️ nullifier 불일치! 이벤트: ${eventNullifierBigInt.toString()}, publicSignals: ${publicSignalsNullifierBigInt.toString()}`
                    )
                  }
                } catch (compareError) {
                  warn(`[EventParser] nullifier 비교 실패:`, compareError)
                }

                debug(
                  `[EventParser] VoteCast 이벤트 상세: pollId=${eventPollId}, nullifier=${eventNullifierStr.substring(
                    0,
                    30
                  )}..., candidate=${eventCandidate}, isUpdate=${isUpdateFromEvent}`
                )

                // 디버깅: Etherscan 링크와 함께 isUpdate 값 확인
                debug(`[EventParser] ========== Etherscan 확인 정보 ==========`)
                debug(`[EventParser] 트랜잭션 해시: ${txHash}`)
                debug(
                  `[EventParser] Etherscan 링크: https://sepolia.etherscan.io/tx/${txHash}`
                )
                debug(
                  `[EventParser] 이벤트에서 파싱한 isUpdate: ${isUpdateFromEvent}`
                )
                debug(
                  `[EventParser] 이벤트 pollId: ${eventPollId}, 이벤트 nullifier: ${eventNullifierStr.substring(
                    0,
                    50
                  )}...`
                )
                debug(
                  `[EventParser] 전달한 pollIdNumeric: ${pollIdNumeric}, 전달한 nullifier: ${publicSignals[2]
                    ?.toString()
                    .substring(0, 50)}...`
                )

                // ⚠️ 중요: pollId와 nullifier 값 비교
                const publicSignalsPollId = String(publicSignals[1] || 'N/A')
                const publicSignalsNullifier = String(
                  publicSignals[2] || 'N/A'
                )

                const pollIdMatch =
                  eventPollId === String(pollIdNumeric) &&
                  eventPollId === publicSignalsPollId
                const nullifierMatch =
                  eventNullifierStr === publicSignalsNullifier

                debug(
                  `[EventParser] ⚠️ pollId 일치 여부: ${pollIdMatch} (이벤트: ${eventPollId}, 전달: ${pollIdNumeric}, publicSignals[1]: ${publicSignalsPollId})`
                )
                debug(
                  `[EventParser] ⚠️ nullifier 일치 여부: ${nullifierMatch} (이벤트: ${eventNullifierStr.substring(
                    0,
                    50
                  )}..., publicSignals[2]: ${publicSignalsNullifier.substring(
                    0,
                    50
                  )}...)`
                )

                if (!pollIdMatch || !nullifierMatch) {
                  warn(`[EventParser] ⚠️ 경고: pollId 또는 nullifier 불일치!`)
                  warn(
                    `[EventParser] 이벤트 pollId: ${eventPollId}, 전달 pollId: ${pollIdNumeric}`
                  )
                  warn(
                    `[EventParser] 이벤트 nullifier: ${eventNullifierStr.substring(
                      0,
                      50
                    )}...`
                  )
                  warn(
                    `[EventParser] 전달 nullifier: ${publicSignalsNullifier.substring(
                      0,
                      50
                    )}...`
                  )
                }

                // ⚠️ 재투표 디버깅: isUpdate가 false인 이유 분석
                debug(`[EventParser] ========== 재투표 디버깅 ==========`)
                debug(
                  `[EventParser] ⚠️ Etherscan에서 isUpdate가 false로 표시되면, 컨트랙트에서 실제로 false로 계산된 것입니다.`
                )
                debug(
                  `[EventParser] ⚠️ 컨트랙트 로직: bool isUpdate = votes[${eventPollId}][${eventNullifierStr.substring(
                    0,
                    30
                  )}...].exists;`
                )
                debug(
                  `[EventParser] ⚠️ 이것은 votes[${eventPollId}][${eventNullifierStr.substring(
                    0,
                    30
                  )}...].exists가 false였다는 의미입니다.`
                )
                debug(
                  `[EventParser] ⚠️ 재투표하려면 같은 pollId와 같은 nullifier를 사용해야 합니다.`
                )
                debug(
                  `[EventParser] ⚠️ nullifier = Poseidon(identityNullifier, pollId)`
                )
                debug(
                  `[EventParser] ⚠️ 같은 pollId에서 재투표하려면: 같은 identityNullifier를 사용해야 합니다.`
                )
                debug(`[EventParser] ⚠️ 가능한 원인:`)
                debug(
                  `[EventParser] ⚠️   1) 다른 identityNullifier를 사용함 (localStorage 초기화, 다른 지갑 등)`
                )
                debug(
                  `[EventParser] ⚠️   2) 다른 pollId를 사용함 (다른 투표 페이지)`
                )
                debug(`[EventParser] ⚠️   3) 첫 투표인 경우 (정상)`)
                debug(
                  `[EventParser] ⚠️ 확인 방법: Etherscan에서 이전 투표의 pollId와 nullifier를 비교하세요.`
                )
                break
              } else {
                debug(
                  `[EventParser] 파싱된 이벤트 이름이 VoteCast가 아님: ${parsed?.name}`
                )
              }
            } catch (parseError) {
              debug(
                `[EventParser] parseLog 실패, decodeEventLog 시도...`,
                parseError
              )
              // parseLog 실패 시 decodeEventLog 시도
              try {
                const decoded = contract.interface.decodeEventLog(
                  'VoteCast',
                  log.data,
                  log.topics
                )
                // isUpdate 값 추출 (여러 방법 시도)
                const isUpdateValue = decoded.isUpdate
                debug(
                  `[EventParser] decoded.isUpdate 원본: ${isUpdateValue}, 타입: ${typeof isUpdateValue}`
                )

                if (typeof isUpdateValue === 'boolean') {
                  isUpdateFromEvent = isUpdateValue
                } else if (typeof isUpdateValue === 'number') {
                  isUpdateFromEvent = isUpdateValue !== 0
                } else if (typeof isUpdateValue === 'string') {
                  isUpdateFromEvent =
                    isUpdateValue.toLowerCase() === 'true' ||
                    isUpdateValue === '1'
                } else if (
                  isUpdateValue !== null &&
                  isUpdateValue !== undefined
                ) {
                  isUpdateFromEvent = Boolean(isUpdateValue)
                }

                // 이벤트 데이터 추출
                eventPollId = decoded.pollId?.toString() || null
                eventNullifier = decoded.nullifier?.toString() || null
                eventCandidate =
                  typeof decoded.candidate === 'number'
                    ? decoded.candidate
                    : typeof decoded.candidate === 'bigint'
                      ? Number(decoded.candidate)
                      : null

                debug(
                  `[EventParser] ✅ decodeEventLog로 isUpdate 파싱 성공: ${isUpdateFromEvent} (원본 값: ${isUpdateValue}, 타입: ${typeof isUpdateValue})`
                )
                break
              } catch (decodeError) {
                // 두 방법 모두 실패 시 다음 로그 시도
                warn(
                  `[EventParser] 이벤트 파싱 실패 (다른 이벤트일 수 있음):`,
                  decodeError
                )
              }
            }
          }
        }

        if (isUpdateFromEvent === null) {
          warn(
            `[EventParser] VoteCast 이벤트를 찾지 못함. 로그 수: ${txReceipt.logs.length}`
          )
        }
      } else {
        warn(`[EventParser] VoteCast 이벤트를 찾을 수 없음 (ABI 확인 필요)`)
      }
    } else {
      warn(`[EventParser] ⚠️ Cannot parse events: receipt or logs not available`)
    }
  } catch (eventError) {
    warn(`[EventParser] 이벤트 파싱 실패 (기존 로직 사용):`, eventError)
  }

  return {
    isUpdate: isUpdateFromEvent,
    pollId: eventPollId,
    nullifier: eventNullifier,
    candidate: eventCandidate,
  }
}

