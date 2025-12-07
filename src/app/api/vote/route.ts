/**
 * @swagger
 * /api/vote:
 *   post:
 *     summary: 투표 생성
 *     description: 새로운 투표를 생성합니다. MetaMask 지갑 주소만 있으면 누구나 생성 가능합니다.
 *     tags: [Vote]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - candidates
 *               - startTime
 *               - endTime
 *               - creatorWallet
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: "2025년 학과 회장 선거"
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "학과 회장 선거입니다."
 *               candidates:
 *                 type: array
 *                 minItems: 2
 *                 maxItems: 10
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - label
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "opt0"
 *                     label:
 *                       type: string
 *                       maxLength: 100
 *                       example: "홍길동"
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-01-20T00:00:00Z"
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-01-21T23:59:59Z"
 *               creatorWallet:
 *                 type: string
 *                 pattern: "^0x[a-fA-F0-9]{40}$"
 *                 example: "0x1234567890123456789012345678901234567890"
 *               merkleRoot:
 *                 type: string
 *                 pattern: "^0x[a-fA-F0-9]{64}$"
 *                 example: "0x0000000000000000000000000000000000000000000000000000000000000000"
 *               chainId:
 *                 type: integer
 *                 default: 11155111
 *                 example: 11155111
 *     responses:
 *       201:
 *         description: 투표 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pollId:
 *                   type: string
 *                   format: uuid
 *                   example: "344e5607-eede-4eff-a02c-57eafc194291"
 *                 pollIdNumeric:
 *                   type: integer
 *                   example: 1234567890
 *                 title:
 *                   type: string
 *                   example: "2025년 학과 회장 선거"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 onchainTxHash:
 *                   type: string
 *                   nullable: true
 *                   example: "0xabc123..."
 *       400:
 *         description: 입력 데이터 검증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: 내가 만든 투표 목록 조회
 *     description: 특정 지갑 주소로 생성된 투표 목록을 조회합니다.
 *     tags: [Vote]
 *     parameters:
 *       - in: query
 *         name: creator
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^0x[a-fA-F0-9]{40}$"
 *         description: 생성자 지갑 주소
 *         example: "0x1234567890123456789012345678901234567890"
 *     responses:
 *       200:
 *         description: 투표 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 5
 *                 polls:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       pollId:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       startTime:
 *                         type: string
 *                         format: date-time
 *                       endTime:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                         enum: [active, pending, ended]
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: creator 파라미터 누락
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import dbConnect from '@/lib/dbConnect'
import Poll from '@/models/Poll'
import { v4 as uuidv4 } from 'uuid'
import { ethers } from 'ethers'
import { createElectionOnChain } from '@/lib/contractsV2'

// Zod 검증 스키마
const createPollSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  candidates: z
    .array(
      z.object({
        id: z.string().min(1), // 문자열 ID (opt1, opt2 등)
        label: z.string().min(1).max(100),
      })
    )
    .min(2)
    .max(8), // 최대 8개 (ZKP 회로 제약)
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  creatorWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  merkleRoot: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .optional(), // 선택사항
  chainId: z.number().int().optional().default(11155111),
})

export async function POST(request: NextRequest) {
  try {
    // 요청 바디 파싱
    const body = await request.json()

    // Zod 검증
    const validatedData = createPollSchema.parse(body)

    // MetaMask만 있으면 누구나 투표 생성 가능 ✅

    // 시작/종료 시간 검증
    const startTime = new Date(validatedData.startTime)
    const endTime = new Date(validatedData.endTime)

    if (endTime <= startTime) {
      return NextResponse.json(
        {
          error: 'INVALID_TIME_RANGE',
          message: '종료 시간은 시작 시간보다 늦어야 합니다.',
        },
        { status: 400 }
      )
    }

    // DB 연결
    await dbConnect()

    // pollId 생성 (UUID)
    const pollIdUuid = uuidv4()

    // pollId를 숫자로 변환 (온체인용)
    // UUID의 첫 8자리를 16진수로 파싱하여 숫자 ID 생성
    const pollIdNumeric = parseInt(pollIdUuid.substring(0, 8), 16)

    // 온체인에 투표 생성 (선택적 - ENABLE_ONCHAIN_CREATION=true일 때만)
    let onchainTxHash: string | null = null

    if (process.env.ENABLE_ONCHAIN_CREATION === 'true') {
      try {
        const relayerKey = process.env.RELAYER_PRIVATE_KEY
        const rpcUrl = process.env.INFURA_URL || process.env.ALCHEMY_URL

        if (relayerKey && rpcUrl) {
          const provider = new ethers.JsonRpcProvider(rpcUrl)
          const signer = new ethers.Wallet(relayerKey, provider)

          // Merkle Root (없으면 0x00...00)
          const merkleRoot = validatedData.merkleRoot || ethers.ZeroHash

          // 후보 이름 배열
          const candidateNames = validatedData.candidates.map((c) => c.label)

          // 온체인 투표 생성
          onchainTxHash = await createElectionOnChain(
            pollIdNumeric,
            merkleRoot,
            Math.floor(startTime.getTime() / 1000),
            Math.floor(endTime.getTime() / 1000),
            candidateNames,
            signer
          )

          const { debug } = await import('@/lib/logger')
          debug(`[Vote] Election created on-chain: ${onchainTxHash}`)
        }
      } catch (onchainError: unknown) {
        const err = onchainError as { message?: string }
        const { error: logError } = await import('@/lib/logger')
        logError('[Vote] On-chain creation failed:', err.message)
        // 온체인 실패해도 DB에는 저장 (offline 모드)
      }
    }

    // Poll 생성 (DB)
    const poll = await Poll.create({
      pollId: pollIdUuid,
      title: validatedData.title,
      description: validatedData.description || '',
      candidates: validatedData.candidates,
      startTime,
      endTime,
      creatorWallet: validatedData.creatorWallet.toLowerCase(),
      merkleRoot: validatedData.merkleRoot,
      chainId: validatedData.chainId,
      status: 'active',
      createdAt: new Date(),
    })

    const { debug } = await import('@/lib/logger')
    debug(
      `[Vote] Created poll: ${pollIdUuid} (numeric: ${pollIdNumeric}) by ${validatedData.creatorWallet}`
    )

    return NextResponse.json(
      {
        success: true,
        pollId: poll.pollId,
        pollIdNumeric, // 온체인 투표 ID
        title: poll.title,
        createdAt: poll.createdAt,
        onchainTxHash, // 온체인 생성 트랜잭션 (있으면)
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string; errors?: unknown }
    const { error: logError } = await import('@/lib/logger')
    logError('[Vote] POST error:', err)

    // Zod 검증 오류
    if (err.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: '입력 데이터가 올바르지 않습니다.',
          details: err.errors,
        },
        { status: 400 }
      )
    }

    // MongoDB 오류
    const mongoErr = err as { code?: number }
    if (mongoErr.code === 11000) {
      return NextResponse.json(
        {
          error: 'DUPLICATE_POLL',
          message: '이미 존재하는 투표입니다.',
        },
        { status: 409 }
      )
    }

    // 기타 오류
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: '투표 생성 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

// GET /api/vote?creator=0x... - 내가 만든 투표 목록
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creator = searchParams.get('creator')

    if (!creator) {
      return NextResponse.json(
        { error: 'MISSING_CREATOR', message: 'creator 파라미터가 필요합니다.' },
        { status: 400 }
      )
    }

    // DB 연결
    await dbConnect()

    // 투표 목록 조회
    const polls = await Poll.find({
      creatorWallet: creator.toLowerCase(),
    })
      .select('pollId title description startTime endTime status createdAt')
      .sort({ createdAt: -1 })
      .limit(50)

    // 현재 시간 기준으로 상태 계산
    const now = new Date()

    return NextResponse.json({
      success: true,
      count: polls.length,
      polls: polls.map((p) => {
        // 현재 시간 기준으로 상태 계산
        let calculatedStatus: 'active' | 'pending' | 'ended'
        if (now < p.startTime) {
          calculatedStatus = 'pending'
        } else if (now > p.endTime) {
          calculatedStatus = 'ended'
        } else {
          calculatedStatus = 'active'
        }

        return {
          pollId: p.pollId,
          title: p.title,
          description: p.description,
          startTime: p.startTime,
          endTime: p.endTime,
          status: calculatedStatus, // 계산된 상태 사용
          createdAt: p.createdAt,
        }
      }),
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    const { error: logError } = await import('@/lib/logger')
    logError('[Vote] GET error:', err)
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: '투표 목록 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}
