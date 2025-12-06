/**
 * @swagger
 * /api/relay:
 *   post:
 *     summary: Relayer 가스 대납 (투표 제출)
 *     description: |
 *       ZKP 증명을 포함한 투표를 블록체인에 제출합니다. Relayer가 가스비를 대납하므로 사용자는 가스비를 지불할 필요가 없습니다.
 *
 *       **재투표 정책**: 마감 시간 전까지 재투표가 가능하며, 마지막 투표만 유효합니다.
 *
 *       **트랜잭션 확인**: 2회 컨펌을 대기합니다 (약 1-2분).
 *     tags: [Relay]
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ethers } from 'ethers'
import dbConnect from '@/lib/dbConnect'
import Vote from '@/models/Vote'
import Poll from '@/models/Poll'
import {
  VOTING_V2_ABI,
  VOTING_V2_ADDRESS,
  electionExists,
  createElectionOnChain,
} from '@/lib/contractsV2'
import { debug, info, warn, error } from '@/lib/logger'

// Zod 검증 스키마
const relaySchema = z.object({
  pollId: z.string().uuid(),
  proposalId: z.number().int().min(0).max(7), // 후보 ID (0-7)
  proof: z.object({
    a: z.array(z.string()).length(2),
    b: z.array(z.array(z.string()).length(2)).length(2),
    c: z.array(z.string()).length(2),
  }),
  publicSignals: z.array(z.string()),
  voterAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
})

// Nonce 관리 (간단한 in-memory 큐)
let nonceQueue: number | null = null

async function getNextNonce(
  provider: ethers.Provider,
  address: string
): Promise<number> {
  if (nonceQueue === null) {
    nonceQueue = await provider.getTransactionCount(address, 'latest')
  }
  return nonceQueue++
}

export async function POST(request: NextRequest) {
  const maxRetries = 2
  let attempt = 0

  try {
    // 요청 바디 파싱 & 검증
    const body = await request.json()
    const validatedData = relaySchema.parse(body)

    // 환경 변수 확인
    const relayerKey = process.env.RELAYER_PRIVATE_KEY
    const rpcUrl = process.env.INFURA_URL || process.env.ALCHEMY_URL

    // VotingV2 사용 (다중 투표 지원)
    const contractAddress = VOTING_V2_ADDRESS
    const contractABI = VOTING_V2_ABI

    if (!relayerKey) {
      return NextResponse.json(
        {
          error: 'RELAYER_NOT_CONFIGURED',
          message: 'Relayer가 설정되지 않았습니다.',
        },
        { status: 503 }
      )
    }

    if (!rpcUrl) {
      return NextResponse.json(
        {
          error: 'RPC_NOT_CONFIGURED',
          message: 'RPC URL이 설정되지 않았습니다.',
        },
        { status: 503 }
      )
    }

    if (!contractAddress) {
      return NextResponse.json(
        {
          error: 'CONTRACT_NOT_DEPLOYED',
          message: '컨트랙트 주소가 설정되지 않았습니다.',
        },
        { status: 503 }
      )
    }

    // Provider & Signer 설정
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const relayer = new ethers.Wallet(relayerKey, provider)

    // 컨트랙트 인스턴스
    const contract = new ethers.Contract(contractAddress, contractABI, relayer)

    // pollId를 숫자로 변환 (VotingV2용)
    const pollIdNumeric = parseInt(validatedData.pollId.substring(0, 8), 16)

    // Proof 파라미터 변환
    const { proof, publicSignals } = validatedData
    const proofParam = [proof.a, proof.b, proof.c]

    // DB 연결 (중복 체크용)
    await dbConnect()

    // nullifierHash 추출 (publicSignals[2] 가정)
    const nullifierHash = publicSignals[2] || publicSignals[0]

    // 재투표 감지 (마지막 표만 유효 - 컨트랙트 정책과 일치)
    // 컨트랙트는 재투표를 허용하고 마지막 표만 유효하므로,
    // DB에서도 기존 투표를 업데이트하도록 허용
    const existingVote = await Vote.findOne({
      pollId: validatedData.pollId,
      nullifierHash,
    })

    // 재투표인 경우 로그만 남기고 계속 진행 (컨트랙트가 마지막 표만 유효하게 처리)
    if (existingVote) {
      info(
        `[Relayer] Re-vote detected for pollId ${
          validatedData.pollId
        }, nullifier ${nullifierHash.substring(
          0,
          10
        )}... (last vote will be valid)`
      )
    }

    // VotingV2: Election 존재 여부 확인 및 자동 생성
    const exists = await electionExists(pollIdNumeric)
    if (!exists) {
      info(
        `[Relayer] Election not found for pollId ${pollIdNumeric}, creating...`
      )

      // DB에서 Poll 정보 가져오기
      const poll = await Poll.findOne({ pollId: validatedData.pollId })
      if (!poll) {
        return NextResponse.json(
          {
            error: 'POLL_NOT_FOUND',
            message: '투표를 찾을 수 없습니다.',
          },
          { status: 404 }
        )
      }

      // Merkle Root (없으면 0x00...00)
      const merkleRoot = poll.merkleRoot || ethers.ZeroHash

      // 후보 이름 배열
      const candidateNames = poll.candidates.map((c) => c.label)

      // 시작/종료 시간 (Unix timestamp)
      const startTime = Math.floor(new Date(poll.startTime).getTime() / 1000)
      const endTime = Math.floor(new Date(poll.endTime).getTime() / 1000)

      // Election 생성
      try {
        const createTxHash = await createElectionOnChain(
          pollIdNumeric,
          merkleRoot,
          startTime,
          endTime,
          candidateNames,
          relayer
        )
        info(
          `[Relayer] Election created on-chain: ${createTxHash} for pollId ${pollIdNumeric}`
        )

        // Election 생성 트랜잭션 확인 대기 (1 confirmation)
        await provider.waitForTransaction(createTxHash, 1)
      } catch (createError: unknown) {
        const err = createError as { message?: string }
        error('[Relayer] Failed to create election:', err)
        return NextResponse.json(
          {
            error: 'ELECTION_CREATION_FAILED',
            message: '투표 생성에 실패했습니다.',
            details: err.message || 'Unknown error',
          },
          { status: 500 }
        )
      }
    }

    // 재시도 로직
    let txHash: string | null = null
    let txReceipt: ethers.TransactionReceipt | null = null

    while (attempt <= maxRetries) {
      try {
        debug(
          `[Relayer] Attempt ${attempt + 1}/${maxRetries + 1} for pollId: ${
            validatedData.pollId
          }`
        )

        // Nonce 관리
        const nonce = await getNextNonce(provider, relayer.address)

        // 디버깅: 재투표 감지용 로그
        debug(
          `[Relayer] 투표 제출 정보: pollId=${pollIdNumeric}, nullifier=${nullifierHash.substring(
            0,
            20
          )}..., proposalId=${validatedData.proposalId}`
        )
        debug(
          `[Relayer] Public Signals: [0]=${publicSignals[0]?.substring(
            0,
            20
          )}..., [1]=${publicSignals[1]}, [2]=${publicSignals[2]?.substring(
            0,
            20
          )}..., [3]=${publicSignals[3]?.substring(0, 20)}...`
        )

        // 가스 추정 + 20% 버퍼
        // VotingV2: vote(pollId, proposalId, ...)
        const estimatedGas = await contract.vote.estimateGas(
          pollIdNumeric,
          validatedData.proposalId,
          proof.a,
          proof.b,
          proof.c,
          publicSignals
        )
        const gasLimit = (estimatedGas * 120n) / 100n

        const tx = await contract.vote(
          pollIdNumeric,
          validatedData.proposalId,
          proof.a,
          proof.b,
          proof.c,
          publicSignals,
          { nonce, gasLimit }
        )

        txHash = tx.hash
        info(`[Relayer] Transaction sent: ${txHash}`)
        debug(
          `[Relayer] Waiting for 2 confirmations (this may take 1-3 minutes)...`
        )

        // conf=2 대기 (타임아웃: 5분)
        const startTime = Date.now()
        try {
          /**
           * 첫 번째 confirmation 대기
           *
           * Promise.race를 사용하여:
           * - tx.wait(1): 첫 번째 블록 컨펌 대기
           * - timeout: 3분 내에 컨펌되지 않으면 타임아웃
           *
           * 반환 타입: ethers.TransactionReceipt (tx.wait의 반환 타입)
           */
          const receipt1 = (await Promise.race([
            tx.wait(1),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error('First confirmation timeout')),
                3 * 60 * 1000
              )
            ),
          ])) as ethers.TransactionReceipt
          const elapsed1 = ((Date.now() - startTime) / 1000).toFixed(1)
          info(
            `[Relayer] First confirmation received at block ${receipt1.blockNumber} (${elapsed1}s)`
          )

          // 두 번째 confirmation 대기
          const receipt2 = (await Promise.race([
            tx.wait(2),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error('Second confirmation timeout')),
                2 * 60 * 1000
              )
            ),
          ])) as ethers.TransactionReceipt
          const elapsed2 = ((Date.now() - startTime) / 1000).toFixed(1)
          info(
            `[Relayer] Second confirmation received at block ${receipt2.blockNumber} (${elapsed2}s)`
          )

          txReceipt = receipt2
          info(
            `[Relayer] ✅ Transaction fully confirmed: ${txHash} (total: ${elapsed2}s)`
          )
        } catch (timeoutError: unknown) {
          const err = timeoutError as { message?: string }
          warn(`[Relayer] ⚠️ Confirmation timeout: ${err.message || 'Unknown'}`)
          throw new Error(
            `Transaction confirmation timeout. The transaction was sent (${txHash}) but confirmations are taking too long. Please check the transaction status manually.`
          )
        }
        break
      } catch (catchError: unknown) {
        attempt++
        const err = catchError as { message?: string }
        error(
          `[Relayer] Attempt ${attempt} failed:`,
          err.message || 'Unknown error'
        )

        if (attempt > maxRetries) {
          throw catchError
        }

        // 백오프: 2초 대기
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }

    if (!txHash || !txReceipt) {
      throw new Error('Transaction failed after retries')
    }

    // Public Signals 추출 (영수증 표시용)
    const merkleRoot = publicSignals[0] || '0x' + '0'.repeat(64)
    const pollIdFromProof = publicSignals[1] || '0'
    const nullifierFromProof = publicSignals[2] || nullifierHash
    const voteCommitment = publicSignals[3] || '0x' + '0'.repeat(64)

    // DB에 Vote 기록 또는 업데이트 (candidate + publicSignals 포함)
    // 재투표인 경우 기존 레코드를 업데이트, 아니면 새로 생성
    if (existingVote) {
      // 재투표: 기존 레코드 업데이트 (마지막 표만 유효)
      existingVote.candidate = String(validatedData.proposalId)
      existingVote.txHash = txHash
      existingVote.status = 'confirmed'
      existingVote.confirmedAt = new Date()
      // Public Signals도 업데이트 (영수증 표시용)
      existingVote.merkleRoot = merkleRoot
      existingVote.voteCommitment = voteCommitment
      await existingVote.save()
      info(
        `[Relayer] Vote updated (re-vote) for pollId ${
          validatedData.pollId
        }, nullifier ${nullifierHash.substring(0, 10)}...`
      )
    } else {
      // 첫 투표: 새 레코드 생성
      // 주의: voterAddress는 저장하지 않음 (익명성 보호)
      // candidate는 결과 집계를 위해 저장하되, 투표자 정보와 분리
      await Vote.create({
        pollId: validatedData.pollId,
        candidate: String(validatedData.proposalId), // 후보 ID 저장 (결과 집계용)
        nullifierHash,
        txHash,
        // voterAddress는 저장하지 않음 - 익명성 보호
        status: 'confirmed',
        confirmedAt: new Date(),
        // Public Signals 저장 (영수증 표시용)
        merkleRoot,
        voteCommitment,
      })
      info(
        `[Relayer] Vote created (first vote) for pollId ${validatedData.pollId}`
      )
    }

    return NextResponse.json({
      success: true,
      txHash,
      blockNumber: txReceipt.blockNumber,
      confirmations: 2,
      message: '투표가 성공적으로 제출되었습니다.',
    })
  } catch (catchError: unknown) {
    const err = catchError as { name?: string; message?: string }
    error('[Relayer] POST error:', err)

    // Zod 검증 오류
    if (err.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: '입력 데이터가 올바르지 않습니다.',
          details: (catchError as { errors?: unknown }).errors,
        },
        { status: 400 }
      )
    }

    // 가스 부족
    if (err.message?.includes('insufficient funds')) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_FUNDS',
          message: 'Relayer의 잔액이 부족합니다.',
          code: 'GAS_INSUFFICIENT',
        },
        { status: 503 }
      )
    }

    // Election not found (VotingV2)
    if (err.message?.includes('Election not found')) {
      return NextResponse.json(
        {
          error: 'ELECTION_NOT_FOUND',
          message:
            '온체인에 투표가 등록되지 않았습니다. 투표 생성 시 온체인 등록이 필요합니다.',
          code: 'ELECTION_MISSING',
        },
        { status: 404 }
      )
    }

    // 타임아웃 에러
    if (
      err.message?.includes('timeout') ||
      err.message?.includes('Timeout') ||
      err.message?.includes('confirmation timeout')
    ) {
      return NextResponse.json(
        {
          error: 'CONFIRMATION_TIMEOUT',
          message:
            '트랜잭션 확인 시간이 초과되었습니다. 트랜잭션은 전송되었을 수 있으니 잠시 후 확인해주세요.',
          code: 'TIMEOUT',
          details: err.message,
        },
        { status: 504 }
      )
    }

    // Proof 검증 실패
    if (err.message?.includes('Invalid proof')) {
      return NextResponse.json(
        {
          error: 'INVALID_PROOF',
          message: 'Proof 검증에 실패했습니다.',
          code: 'PROOF_INVALID',
        },
        { status: 400 }
      )
    }

    // 기타 오류
    return NextResponse.json(
      {
        error: 'RELAY_FAILED',
        message: '트랜잭션 전송 중 오류가 발생했습니다.',
        details: err.message,
        attempts: attempt + 1,
      },
      { status: 500 }
    )
  }
}
