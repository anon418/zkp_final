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
  getVotingV2ContractWithSigner,
} from '@/lib/contractsV2'
import { debug, info, warn, error } from '@/lib/logger'
import { ensureElectionExists } from '@/lib/services/election.service'
import { sendVoteTransaction } from '@/lib/services/vote-transaction.service'
import { parseVoteCastEvent } from '@/lib/services/event-parser.service'
import { saveVoteToDB } from '@/lib/services/vote-db.service'

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

// Nonce 관리: 동시성 문제 방지를 위한 락 및 큐
let nonceLock = false
let lastNonce: number | null = null
let lastNonceTime = 0
const NONCE_CACHE_TTL = 10000 // 10초 동안 nonce 캐시 유지 (2초에서 증가)

// Nonce 캐시 무효화 함수 (에러 발생 시 사용)
function invalidateNonceCache() {
  lastNonce = null
  lastNonceTime = 0
  debug(`[Relayer] Nonce cache invalidated`)
}

// Nonce 관리: 항상 최신 상태에서 가져오기 (동시성 문제 방지)
// @param incrementCache: true면 캐시를 증가시키고, false면 읽기만 함 (재확인용)
async function getNextNonce(
  provider: ethers.Provider,
  address: string,
  incrementCache: boolean = true
): Promise<number> {
  // 락이 걸려있으면 잠시 대기
  while (nonceLock) {
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  // 락 획득
  nonceLock = true

  try {
    const now = Date.now()

    // 블록체인에서 최신 nonce 가져오기 (항상 최신 상태 확인)
    const networkNonce = await provider.getTransactionCount(address, 'pending')

    // 캐시된 nonce와 비교하여 더 큰 값 사용
    let nextNonce: number
    if (
      lastNonce !== null &&
      now - lastNonceTime < NONCE_CACHE_TTL &&
      lastNonce >= networkNonce
    ) {
      // 캐시가 유효하고 블록체인보다 크면 캐시 사용
      nextNonce = incrementCache ? lastNonce + 1 : lastNonce
    } else {
      // 캐시가 없거나 만료되었거나 블록체인이 더 크면 블록체인 값 사용
      nextNonce = networkNonce
    }

    // 캐시 업데이트 (incrementCache가 true일 때만)
    if (incrementCache) {
      lastNonce = nextNonce
      lastNonceTime = now
      debug(
        `[Relayer] Fetched nonce from chain: ${networkNonce}, using: ${nextNonce} (cache updated)`
      )
    } else {
      debug(
        `[Relayer] Fetched nonce from chain: ${networkNonce}, using: ${nextNonce} (read-only, no cache update)`
      )
    }

    return nextNonce
  } finally {
    // 락 해제
    nonceLock = false
  }
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

    // Relayer 잔액 확인 (사전 체크)
    try {
      const relayerBalance = await provider.getBalance(relayer.address)
      const balanceEth = parseFloat(ethers.formatEther(relayerBalance))
      const minBalanceEth = 0.01 // 최소 0.01 ETH 권장

      if (balanceEth < minBalanceEth) {
        warn(
          `[Relayer] ⚠️ Relayer 잔액이 낮습니다: ${balanceEth.toFixed(
            4
          )} ETH (권장: ${minBalanceEth} ETH 이상)`
        )
        warn(`[Relayer] ⚠️ Relayer 주소: ${relayer.address}`)
        warn(`[Relayer] ⚠️ Sepolia Faucet: https://sepoliafaucet.com/`)

        // 잔액이 너무 낮으면 (0.001 ETH 미만) 에러 반환
        if (balanceEth < 0.001) {
          return NextResponse.json(
            {
              error: 'INSUFFICIENT_FUNDS',
              message: `Relayer 잔액이 부족합니다. 현재 잔액: ${balanceEth.toFixed(
                4
              )} ETH. 최소 0.001 ETH 이상 필요합니다.`,
              code: 'GAS_INSUFFICIENT',
              relayerAddress: relayer.address,
              currentBalance: balanceEth,
              minRequiredBalance: 0.001,
              faucetUrl: 'https://sepoliafaucet.com/',
            },
            { status: 503 }
          )
        }
      } else {
        debug(`[Relayer] Relayer 잔액 확인: ${balanceEth.toFixed(4)} ETH`)
      }
    } catch (balanceError) {
      warn(`[Relayer] ⚠️ 잔액 확인 실패: ${balanceError}`)
      // 잔액 확인 실패해도 계속 진행 (네트워크 문제일 수 있음)
    }

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
    // publicSignals[2]는 BigInt 문자열이므로, 컨트랙트에 전달할 때는 BigInt로 변환 필요

    // 디버깅: publicSignals 전체 구조 확인
    debug(`[Relayer] ========== Public Signals 디버깅 ==========`)
    debug(
      `[Relayer] publicSignals 타입: ${
        Array.isArray(publicSignals) ? 'Array' : typeof publicSignals
      }`
    )
    debug(
      `[Relayer] publicSignals 길이: ${
        Array.isArray(publicSignals) ? publicSignals.length : 'N/A'
      }`
    )
    if (Array.isArray(publicSignals)) {
      publicSignals.forEach((signal, idx) => {
        debug(
          `[Relayer] publicSignals[${idx}]: 타입=${typeof signal}, 값=${signal
            ?.toString()
            .substring(0, 50)}...`
        )
      })
    }

    const nullifierHashRaw = publicSignals[2] || publicSignals[0]
    debug(
      `[Relayer] nullifierHashRaw: 타입=${typeof nullifierHashRaw}, 값=${nullifierHashRaw?.toString()}`
    )

    const nullifierHash = nullifierHashRaw.startsWith('0x')
      ? nullifierHashRaw
      : `0x${BigInt(nullifierHashRaw).toString(16).padStart(64, '0')}`

    debug(
      `[Relayer] nullifierHash 변환: 원본=${nullifierHashRaw
        ?.toString()
        .substring(0, 30)}..., 변환=${nullifierHash.substring(0, 30)}...`
    )
    debug(`[Relayer] nullifierHash 전체: ${nullifierHash}`)

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
    const electionResult = await ensureElectionExists({
      pollId: validatedData.pollId,
      pollIdNumeric,
      provider,
      relayer,
      getNextNonce,
      invalidateNonceCache,
    })

    if (!electionResult.success) {
      if (electionResult.error === 'POLL_NOT_FOUND') {
        return NextResponse.json(
          {
            error: 'POLL_NOT_FOUND',
            message: '투표를 찾을 수 없습니다.',
          },
          { status: 404 }
        )
      }
      return NextResponse.json(
        {
          error: electionResult.error || 'ELECTION_CREATION_FAILED',
          message: '투표 생성에 실패했습니다.',
          details: electionResult.error,
        },
        { status: 500 }
      )
    }

    // Election이 이미 존재하거나 생성 완료됨 (ensureElectionExists에서 처리됨)

    // Vote 트랜잭션 전송
    const voteResult = await sendVoteTransaction({
      pollIdNumeric,
      proposalId: validatedData.proposalId,
      proof: validatedData.proof,
      publicSignals,
      provider,
      relayer,
      getNextNonce,
      invalidateNonceCache,
      maxRetries,
    })

    if (!voteResult.success) {
      return NextResponse.json(
        {
          error: 'VOTE_TRANSACTION_FAILED',
          message: '투표 트랜잭션 전송에 실패했습니다.',
          details: voteResult.error,
        },
        { status: 500 }
      )
    }

    const txHash = voteResult.txHash
    const txReceipt = voteResult.txReceipt

    if (!txHash) {
      return NextResponse.json(
        {
          error: 'VOTE_TRANSACTION_FAILED',
          message: '트랜잭션 해시를 얻을 수 없습니다.',
        },
        { status: 500 }
      )
    }

    // Receipt가 없어도 트랜잭션 해시가 있으면 계속 진행
    if (!txReceipt) {
      warn(
        `[Relayer] ⚠️ No receipt available, but transaction hash exists: ${txHash}`
      )
      warn(
        `[Relayer] ⚠️ Proceeding without event parsing. User can check transaction on Etherscan.`
      )
    }

    // 트랜잭션 이벤트에서 VoteCast 이벤트 파싱하여 isUpdate 값 가져오기
    const eventResult = parseVoteCastEvent({
      txReceipt,
      txHash,
      contractAddress,
      contractABI,
      provider,
      pollIdNumeric,
      publicSignals,
    })
    const isUpdateFromEvent = eventResult.isUpdate

    // Public Signals 추출 (영수증 표시용)
    const merkleRoot = publicSignals[0] || '0x' + '0'.repeat(64)
    const pollIdFromProof = publicSignals[1] || '0'
    const nullifierFromProof = publicSignals[2] || nullifierHash
    const voteCommitment = publicSignals[3] || '0x' + '0'.repeat(64)

    // DB에 Vote 기록 생성/업데이트
    await saveVoteToDB({
      pollId: validatedData.pollId,
      proposalId: validatedData.proposalId,
      nullifierHash,
      txHash,
      merkleRoot,
      voteCommitment,
      isUpdate: isUpdateFromEvent,
      existingVote: !!existingVote,
    })

    // 재투표 여부 확인
    // 1. 이벤트에서 파싱한 isUpdate 값 우선 사용
    // 2. 없으면 existingVote 확인 (DB 기반)
    const isReVote =
      isUpdateFromEvent !== null ? isUpdateFromEvent : !!existingVote

    // 영수증 반환 (receipt가 없어도 txHash는 반환)
    return NextResponse.json({
      success: true,
      txHash,
      blockNumber: txReceipt?.blockNumber || null, // Receipt가 없을 수 있음
      confirmations: txReceipt?.blockNumber ? 2 : 0, // Receipt가 없으면 0
      message: txReceipt?.blockNumber
        ? '투표가 성공적으로 제출되었습니다.'
        : '투표가 전송되었습니다. 확인 중입니다. (Etherscan에서 확인 가능)',
      isReVote, // 재투표 여부 반환 (컨트랙트 이벤트 기반)
      isUpdate: isUpdateFromEvent, // 컨트랙트의 실제 isUpdate 값 (선택적)
      publicSignals: {
        merkleRoot: publicSignals[0] || '0x' + '0'.repeat(64),
        pollId: publicSignals[1] || '0',
        nullifier: publicSignals[2] || nullifierHash,
        voteCommitment: publicSignals[3] || '0x' + '0'.repeat(64),
      },
      // Receipt가 없을 때를 위한 안내
      ...(txReceipt?.blockNumber === null && {
        note: '트랜잭션이 전송되었지만 아직 확인되지 않았습니다. Etherscan에서 확인해주세요.',
        etherscanUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
      }),
    })
  } catch (catchError: unknown) {
    const err = catchError as { name?: string; message?: string; code?: string }
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
    if (
      err.message?.includes('insufficient funds') ||
      err.code === 'INSUFFICIENT_FUNDS'
    ) {
      // Relayer 잔액 확인 및 상세 정보 제공
      let balanceEth = 0
      let balanceFormatted = '0'
      let relayerAddress = 'unknown'
      try {
        // Provider가 스코프 밖에 있을 수 있으므로 다시 생성
        const rpcUrl = process.env.INFURA_URL || process.env.ALCHEMY_URL
        const relayerKey = process.env.RELAYER_PRIVATE_KEY
        if (rpcUrl && relayerKey) {
          const provider = new ethers.JsonRpcProvider(rpcUrl)
          const relayer = new ethers.Wallet(relayerKey, provider)
          relayerAddress = relayer.address
          const relayerBalance = await provider.getBalance(relayer.address)
          balanceEth = parseFloat(ethers.formatEther(relayerBalance))
          balanceFormatted = balanceEth.toFixed(4)
          error(`[Relayer] ⚠️ Relayer 잔액 부족: ${balanceFormatted} ETH`)
          error(`[Relayer] ⚠️ Relayer 주소: ${relayer.address}`)
          error(
            `[Relayer] ⚠️ Sepolia Faucet에서 ETH를 받아주세요: https://sepoliafaucet.com/`
          )
        }
      } catch (balanceCheckError) {
        warn(`[Relayer] ⚠️ 잔액 확인 실패: ${balanceCheckError}`)
      }

      // 에러 메시지에서 필요한 금액 추출 시도
      let requiredAmount = '0.001'
      if (err.message?.includes('overshot')) {
        // "overshot 808376425666138" 같은 메시지에서 부족한 금액 추출
        const overshotMatch = err.message.match(/overshot\s+(\d+)/)
        if (overshotMatch) {
          const overshotWei = BigInt(overshotMatch[1])
          requiredAmount = parseFloat(ethers.formatEther(overshotWei)).toFixed(
            4
          )
        }
      }

      return NextResponse.json(
        {
          error: 'INSUFFICIENT_FUNDS',
          message: `Relayer 잔액이 부족합니다. 현재 잔액: ${balanceFormatted} ETH. 최소 ${requiredAmount} ETH 이상 필요합니다.`,
          code: 'GAS_INSUFFICIENT',
          relayerAddress: relayerAddress,
          currentBalance: balanceEth,
          minRequiredBalance: parseFloat(requiredAmount),
          faucetUrl: 'https://sepoliafaucet.com/',
          details:
            'Relayer 지갑에 Sepolia ETH를 충전해주세요. Sepolia는 테스트넷이므로 무료로 받을 수 있습니다.',
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
