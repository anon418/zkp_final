/**
 * Election 생성 및 관리 서비스
 * 
 * @description
 * 블록체인에 Election을 생성하고, 생성 완료를 확인하는 로직을 담당합니다.
 * 재시도 로직, 가스 가격 관리, 트랜잭션 컨펌 대기 등을 포함합니다.
 */

import { ethers } from 'ethers'
import {
  electionExists,
  createElectionOnChain,
  getVotingV2ContractWithSigner,
} from '@/lib/contractsV2'
import Poll from '@/models/Poll'
import { debug, info, warn, error } from '@/lib/logger'

export interface CreateElectionParams {
  pollId: string
  pollIdNumeric: number
  provider: ethers.Provider
  relayer: ethers.Wallet
  getNextNonce: (
    provider: ethers.Provider,
    address: string,
    incrementCache?: boolean
  ) => Promise<number>
  invalidateNonceCache: () => void
}

export interface CreateElectionResult {
  success: boolean
  txHash: string | null
  error?: string
}

/**
 * Election이 존재하는지 확인하고, 없으면 생성합니다.
 * 
 * @param params Election 생성에 필요한 파라미터
 * @returns Election 생성 결과
 */
export async function ensureElectionExists(
  params: CreateElectionParams
): Promise<CreateElectionResult> {
  const {
    pollId,
    pollIdNumeric,
    provider,
    relayer,
    getNextNonce,
    invalidateNonceCache,
  } = params

  // Election 존재 여부 확인
  const exists = await electionExists(pollIdNumeric)
  if (exists) {
    debug(`[ElectionService] Election already exists for pollId ${pollIdNumeric}`)
    return { success: true, txHash: null }
  }

  info(
    `[ElectionService] Election not found for pollId ${pollIdNumeric}, creating...`
  )

  // DB에서 Poll 정보 가져오기
  const poll = await Poll.findOne({ pollId })
  if (!poll) {
    return {
      success: false,
      txHash: null,
      error: 'POLL_NOT_FOUND',
    }
  }

  // Merkle Root (없으면 0x00...00)
  const merkleRoot = poll.merkleRoot || ethers.ZeroHash

  // 후보 이름 배열
  const candidateNames = poll.candidates.map((c) => c.label)

  // 시작/종료 시간 (Unix timestamp)
  const startTime = Math.floor(new Date(poll.startTime).getTime() / 1000)
  const endTime = Math.floor(new Date(poll.endTime).getTime() / 1000)

  // Election 생성 (재시도 로직 포함)
  const result = await createElectionWithRetry({
    pollIdNumeric,
    merkleRoot,
    startTime,
    endTime,
    candidateNames,
    provider,
    relayer,
    getNextNonce,
    invalidateNonceCache,
  })

  // Election이 생성될 때까지 대기 (타임아웃 후에도)
  if (result.success && result.txHash) {
    await waitForElectionCreation(pollIdNumeric, result.txHash, provider)
  }

  return result
}

/**
 * Election 생성 트랜잭션을 재시도 로직과 함께 실행합니다.
 */
async function createElectionWithRetry(params: {
  pollIdNumeric: number
  merkleRoot: string
  startTime: number
  endTime: number
  candidateNames: string[]
  provider: ethers.Provider
  relayer: ethers.Wallet
  getNextNonce: (
    provider: ethers.Provider,
    address: string,
    incrementCache?: boolean
  ) => Promise<number>
  invalidateNonceCache: () => void
}): Promise<CreateElectionResult> {
  const {
    pollIdNumeric,
    merkleRoot,
    startTime,
    endTime,
    candidateNames,
    provider,
    relayer,
    getNextNonce,
    invalidateNonceCache,
  } = params

  const maxCreateRetries = 2
  let createAttempt = 0
  let createTxHash: string | null = null

  while (createAttempt <= maxCreateRetries && !createTxHash) {
    try {
      debug(
        `[ElectionService] createElection attempt ${createAttempt + 1}/${
          maxCreateRetries + 1
        }`
      )

      // Nonce 관리 (항상 최신 상태에서 가져오기)
      const createNonce = await getNextNonce(provider, relayer.address, true)
      debug(
        `[ElectionService] Using nonce for createElection: ${createNonce} (attempt ${
          createAttempt + 1
        })`
      )

      // Gas 가격 동적 설정 (EIP-1559)
      const feeData = await provider.getFeeData()
      const multipliers = [1.0, 1.5, 2.0]
      const baseMultiplier = multipliers[createAttempt] || 2.0

      const maxFeePerGas = feeData.maxFeePerGas
        ? (feeData.maxFeePerGas * BigInt(Math.floor(baseMultiplier * 100))) /
          100n
        : undefined
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas
        ? (feeData.maxPriorityFeePerGas *
            BigInt(Math.floor(baseMultiplier * 100))) /
          100n
        : undefined

      // Gas Limit 추정
      const contract = await getVotingV2ContractWithSigner(relayer)
      const estimatedGas = await contract.createElection.estimateGas(
        pollIdNumeric,
        merkleRoot,
        startTime,
        endTime,
        candidateNames
      )
      const gasLimit = (estimatedGas * 120n) / 100n

      debug(
        `[ElectionService] Gas settings for createElection: maxFeePerGas=${maxFeePerGas?.toString()}, maxPriorityFeePerGas=${maxPriorityFeePerGas?.toString()}, gasLimit=${gasLimit.toString()}`
      )

      debug(`[ElectionService] Calling createElectionOnChain...`)
      try {
        createTxHash = await createElectionOnChain(
          pollIdNumeric,
          merkleRoot,
          startTime,
          endTime,
          candidateNames,
          relayer,
          {
            nonce: createNonce,
            gasLimit,
            ...(maxFeePerGas && { maxFeePerGas }),
            ...(maxPriorityFeePerGas && { maxPriorityFeePerGas }),
          }
        )
        info(
          `[ElectionService] Election created on-chain: ${createTxHash} for pollId ${pollIdNumeric}`
        )
      } catch (createTxError: unknown) {
        const txErr = createTxError as {
          message?: string
          code?: string
          transaction?: { hash?: string }
        }

        // "replacement fee too low" 에러인 경우, pending 트랜잭션 확인
        if (
          txErr.code === 'REPLACEMENT_UNDERPRICED' ||
          txErr.message?.includes('replacement fee too low')
        ) {
          if (txErr.transaction?.hash) {
            debug(
              `[ElectionService] Previous transaction hash: ${txErr.transaction.hash}, checking status...`
            )
            try {
              const prevTx = await provider.getTransaction(
                txErr.transaction.hash
              )
              if (prevTx && prevTx.blockNumber === null) {
                warn(
                  `[ElectionService] Previous transaction ${txErr.transaction.hash} is still pending. Waiting for it to be mined or replaced...`
                )
                try {
                  await Promise.race([
                    provider.waitForTransaction(txErr.transaction.hash, 1),
                    new Promise((resolve) => setTimeout(resolve, 10000)),
                  ])
                } catch {
                  // 타임아웃이어도 계속 진행
                }
              }
            } catch {
              // 트랜잭션을 찾지 못해도 계속 진행
            }
          }
        }

        error(
          `[ElectionService] createElectionOnChain failed: ${
            txErr.message || 'Unknown error'
          }`
        )
        throw createTxError // 재시도 로직으로 전달
      }

      // Election 생성 트랜잭션 확인 대기 (1 confirmation, 타임아웃: 30초)
      debug(
        `[ElectionService] Waiting for createElection confirmation (timeout: 30s)...`
      )
      try {
        const createReceipt = await Promise.race([
          provider.waitForTransaction(createTxHash, 1),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    'CreateElection confirmation timeout (30 seconds)'
                  )
                ),
              30 * 1000
            )
          ),
        ])

        if (createReceipt) {
          info(
            `[ElectionService] ✅ Election creation confirmed at block ${createReceipt.blockNumber}`
          )
        }
      } catch (waitError: unknown) {
        const waitErr = waitError as { message?: string }
        warn(
          `[ElectionService] ⚠️ CreateElection confirmation timeout: ${
            waitErr.message || 'Unknown'
          }`
        )
        warn(`[ElectionService] ⚠️ Transaction was sent: ${createTxHash}`)
        warn(
          `[ElectionService] ⚠️ Continuing with vote submission (Election may still be pending)...`
        )

        // 타임아웃이어도 receipt가 있을 수 있으므로 확인
        try {
          const manualReceipt = await provider.getTransactionReceipt(
            createTxHash
          )
          if (manualReceipt) {
            info(
              `[ElectionService] ✅ Election creation receipt found manually: block ${manualReceipt.blockNumber}`
            )
          } else {
            debug(`[ElectionService] Receipt not found yet, but continuing...`)
          }
        } catch {
          debug(`[ElectionService] Could not fetch receipt, but continuing...`)
        }
      }

      break // 성공 시 루프 종료
    } catch (createError: unknown) {
      const err = createError as { message?: string; code?: string }

      // "replacement fee too low" 또는 "nonce too low" 에러인 경우 재시도
      if (
        (err.code === 'REPLACEMENT_UNDERPRICED' ||
          err.message?.includes('replacement fee too low') ||
          err.message?.includes('nonce too low')) &&
        createAttempt < maxCreateRetries
      ) {
        createAttempt++
        const backoffDelays = [5000, 10000]
        const delay = backoffDelays[createAttempt - 1] || 10000
        warn(
          `[ElectionService] createElection failed (attempt ${createAttempt}/${
            maxCreateRetries + 1
          }): ${
            err.message || 'Unknown error'
          }. Retrying with higher gas price after ${delay}ms...`
        )

        invalidateNonceCache()
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      // 재시도 불가능한 에러 또는 최대 재시도 횟수 초과
      error('[ElectionService] Failed to create election:', err)
      return {
        success: false,
        txHash: null,
        error: err.message || 'Unknown error',
      }
    }
  }

  if (!createTxHash) {
    error('[ElectionService] Failed to create election after all retries')
    return {
      success: false,
      txHash: null,
      error: 'ELECTION_CREATION_FAILED',
    }
  }

  return { success: true, txHash: createTxHash }
}

/**
 * Election이 실제로 생성될 때까지 대기합니다.
 * createElection 트랜잭션이 타임아웃되었을 수 있으므로, election이 생성될 때까지 확인합니다.
 */
async function waitForElectionCreation(
  pollIdNumeric: number,
  createTxHash: string,
  provider: ethers.Provider
): Promise<void> {
  debug(
    `[ElectionService] Waiting for election to be created (checking every 2s, max 2min)...`
  )
  const maxElectionWaitTime = 2 * 60 * 1000 // 2분
  const electionCheckInterval = 2000 // 2초마다 확인
  const electionWaitStart = Date.now()
  let electionCreated = false

  while (
    Date.now() - electionWaitStart < maxElectionWaitTime &&
    !electionCreated
  ) {
    const exists = await electionExists(pollIdNumeric)
    if (exists) {
      electionCreated = true
      info(
        `[ElectionService] ✅ Election confirmed on-chain for pollId ${pollIdNumeric}`
      )
      break
    }

    // 트랜잭션 상태 확인
    try {
      const txReceipt = await provider.getTransactionReceipt(createTxHash)
      if (txReceipt && txReceipt.status === 1) {
        debug(
          `[ElectionService] CreateElection transaction confirmed, waiting for election to be available...`
        )
      }
    } catch {
      // Receipt를 찾지 못해도 계속 확인
    }

    await new Promise((resolve) => setTimeout(resolve, electionCheckInterval))
  }

  if (!electionCreated) {
    const finalCheck = await electionExists(pollIdNumeric)
    if (!finalCheck) {
      error(
        `[ElectionService] Election not found after waiting ${maxElectionWaitTime}ms. Transaction: ${createTxHash}`
      )
    }
  }
}

