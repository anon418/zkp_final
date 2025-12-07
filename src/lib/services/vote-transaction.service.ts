/**
 * Vote 트랜잭션 전송 서비스
 * 
 * @description
 * 블록체인에 Vote 트랜잭션을 전송하고, 컨펌을 대기하는 로직을 담당합니다.
 * 재시도 로직, nonce 관리, pending 트랜잭션 처리 등을 포함합니다.
 */

import { ethers } from 'ethers'
import { getVotingV2ContractWithSigner } from '@/lib/contractsV2'
import { debug, info, warn, error } from '@/lib/logger'

export interface VoteTransactionParams {
  pollIdNumeric: number
  proposalId: number
  proof: {
    a: string[]
    b: string[][]
    c: string[]
  }
  publicSignals: string[]
  provider: ethers.Provider
  relayer: ethers.Wallet
  getNextNonce: (
    provider: ethers.Provider,
    address: string,
    incrementCache?: boolean
  ) => Promise<number>
  invalidateNonceCache: () => void
  maxRetries?: number
}

export interface VoteTransactionResult {
  success: boolean
  txHash: string | null
  txReceipt: ethers.TransactionReceipt | null
  error?: string
}

/**
 * Vote 트랜잭션을 전송하고 컨펌을 대기합니다.
 */
export async function sendVoteTransaction(
  params: VoteTransactionParams
): Promise<VoteTransactionResult> {
  const {
    pollIdNumeric,
    proposalId,
    proof,
    publicSignals,
    provider,
    relayer,
    getNextNonce,
    invalidateNonceCache,
    maxRetries = 2,
  } = params

  let attempt = 0
  let txHash: string | null = null
  let txReceipt: ethers.TransactionReceipt | null = null

  while (attempt <= maxRetries) {
    try {
      debug(
        `[VoteTransaction] Attempt ${attempt + 1}/${maxRetries + 1} for pollId: ${pollIdNumeric}`
      )

      // Nonce 관리 (항상 최신 상태에서 가져오기)
      let nonce = await getNextNonce(provider, relayer.address, true)
      debug(`[VoteTransaction] Using nonce: ${nonce} (attempt ${attempt + 1})`)

      // Pending 트랜잭션 확인 및 대기
      nonce = await handlePendingTransactions(
        provider,
        relayer.address,
        nonce,
        getNextNonce,
        invalidateNonceCache
      )

      // Gas 추정 및 설정
      const contract = await getVotingV2ContractWithSigner(relayer)
      const estimatedGas = await contract.vote.estimateGas(
        pollIdNumeric,
        proposalId,
        proof.a,
        proof.b,
        proof.c,
        publicSignals
      )
      const gasLimit = (estimatedGas * 120n) / 100n

      // 가스 가격 동적 설정 (재시도 시 증가)
      const feeData = await provider.getFeeData()
      const multipliers = [1.0, 1.5, 2.0]
      const baseMultiplier = multipliers[attempt] || 2.0

      const maxFeePerGas = feeData.maxFeePerGas
        ? (feeData.maxFeePerGas * BigInt(Math.floor(baseMultiplier * 100))) /
          100n
        : undefined
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas
        ? (feeData.maxPriorityFeePerGas *
            BigInt(Math.floor(baseMultiplier * 100))) /
          100n
        : undefined

      debug(
        `[VoteTransaction] Gas settings: maxFeePerGas=${maxFeePerGas?.toString()}, maxPriorityFeePerGas=${maxPriorityFeePerGas?.toString()}, gasLimit=${gasLimit.toString()}`
      )

      // 트랜잭션 전송
      const tx = await contract.vote(
        pollIdNumeric,
        proposalId,
        proof.a,
        proof.b,
        proof.c,
        publicSignals,
        {
          nonce,
          gasLimit,
          ...(maxFeePerGas && { maxFeePerGas }),
          ...(maxPriorityFeePerGas && { maxPriorityFeePerGas }),
        }
      )

      txHash = tx.hash
      info(`[VoteTransaction] Transaction sent: ${txHash}`)
      debug(`[VoteTransaction] 트랜잭션 해시: ${txHash}`)
      debug(
        `[VoteTransaction] ⚠️ Etherscan에서 확인할 트랜잭션: https://sepolia.etherscan.io/tx/${txHash}`
      )

      if (!txHash) {
        throw new Error('Transaction hash is null')
      }

      // 트랜잭션 컨펌 대기 (2 confirmations)
      txReceipt = await waitForTransactionConfirmation(
        provider,
        txHash,
        2,
        5 * 60 * 1000 // 5분 타임아웃
      )

      if (txReceipt) {
        info(
          `[VoteTransaction] ✅ Transaction fully confirmed: ${txHash} at block ${txReceipt.blockNumber}`
        )
        return { success: true, txHash, txReceipt }
      }

      // 성공 시 루프 종료
      break
    } catch (txError: unknown) {
      const err = txError as { message?: string; code?: string }

      // 재시도 가능한 에러인 경우
      if (
        (err.code === 'REPLACEMENT_UNDERPRICED' ||
          err.message?.includes('replacement fee too low') ||
          err.message?.includes('nonce too low') ||
          err.message?.includes('Election not found')) &&
        attempt < maxRetries
      ) {
        attempt++
        const backoffDelays = [3000, 5000, 10000]
        const delay = backoffDelays[attempt - 1] || 10000

        warn(
          `[VoteTransaction] Attempt ${attempt} failed: ${
            err.message || 'Unknown error'
          }. Retrying after ${delay}ms...`
        )

        invalidateNonceCache()
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      // 재시도 불가능한 에러
      error(`[VoteTransaction] Failed to send vote transaction:`, err)
      return {
        success: false,
        txHash,
        txReceipt: null,
        error: err.message || 'Unknown error',
      }
    }
  }

  if (!txHash) {
    return {
      success: false,
      txHash: null,
      txReceipt: null,
      error: 'Failed to send transaction after all retries',
    }
  }

  return { success: true, txHash, txReceipt }
}

/**
 * Pending 트랜잭션을 확인하고 처리합니다.
 */
async function handlePendingTransactions(
  provider: ethers.Provider,
  address: string,
  nonce: number,
  getNextNonce: (
    provider: ethers.Provider,
    address: string,
    incrementCache?: boolean
  ) => Promise<number>,
  invalidateNonceCache: () => void
): Promise<number> {
  try {
    const pendingCount = await provider.getTransactionCount(address, 'pending')
    const latestCount = await provider.getTransactionCount(address, 'latest')

    if (pendingCount > latestCount && nonce < pendingCount) {
      warn(
        `[VoteTransaction] ⚠️ Pending transactions detected (pending=${pendingCount}, latest=${latestCount}). Waiting for nonce ${nonce} to be available...`
      )

      const maxWait = 20000 // 20초
      const waitStart = Date.now()
      let resolved = false

      while (Date.now() - waitStart < maxWait && !resolved) {
        await new Promise((resolve) => setTimeout(resolve, 2000)) // 2초마다 확인

        const newPendingCount = await provider.getTransactionCount(
          address,
          'pending'
        )
        const newLatestCount = await provider.getTransactionCount(
          address,
          'latest'
        )

        if (newPendingCount <= newLatestCount || newLatestCount > nonce) {
          resolved = true
          debug(
            `[VoteTransaction] ✅ Pending transactions resolved. New nonce available: ${newLatestCount}`
          )
          invalidateNonceCache()
          nonce = await getNextNonce(provider, address, true)
          break
        }
      }

      if (!resolved) {
        const finalPendingCount = await provider.getTransactionCount(
          address,
          'pending'
        )
        warn(
          `[VoteTransaction] ⚠️ Pending transactions still exist after ${maxWait}ms. Using nonce: ${finalPendingCount}`
        )
        invalidateNonceCache()
        nonce = finalPendingCount
      }
    }
  } catch (pendingCheckError) {
    debug(
      `[VoteTransaction] Could not check pending transactions: ${pendingCheckError}`
    )
  }

  return nonce
}

/**
 * 트랜잭션 컨펌을 대기합니다.
 */
async function waitForTransactionConfirmation(
  provider: ethers.Provider,
  txHash: string,
  confirmations: number,
  timeout: number
): Promise<ethers.TransactionReceipt | null> {
  debug(
    `[VoteTransaction] Waiting for ${confirmations} confirmations (this may take 1-3 minutes)...`
  )

  const startTime = Date.now()
  const progressInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    debug(
      `[VoteTransaction] Still waiting for confirmation... (${elapsed}s elapsed)`
    )
  }, 30000) // 30초마다 로그

  try {
    const receipt = await Promise.race([
      provider.waitForTransaction(txHash, confirmations),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Transaction confirmation timeout (${timeout}ms)`)),
          timeout
        )
      ),
    ])

    clearInterval(progressInterval)
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
    
    if (receipt) {
      info(
        `[VoteTransaction] ✅ Transaction fully confirmed: ${txHash} at block ${receipt.blockNumber} (total: ${totalTime}s)`
      )
    } else {
      info(
        `[VoteTransaction] ✅ Transaction confirmed: ${txHash} (receipt not available, total: ${totalTime}s)`
      )
    }

    return receipt
  } catch (waitError: unknown) {
    clearInterval(progressInterval)
    const waitErr = waitError as { message?: string }
    warn(
      `[VoteTransaction] ⚠️ Transaction confirmation timeout: ${
        waitErr.message || 'Unknown'
      }`
    )

    // 타임아웃이어도 receipt가 있을 수 있으므로 확인
    try {
      const manualReceipt = await provider.getTransactionReceipt(txHash)
      if (manualReceipt) {
        info(
          `[VoteTransaction] ✅ Transaction receipt found manually: block ${manualReceipt.blockNumber}`
        )
        return manualReceipt
      }
    } catch {
      // Receipt를 찾지 못해도 null 반환
    }

    return null
  }
}

