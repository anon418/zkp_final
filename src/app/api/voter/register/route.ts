/**
 * @swagger
 * /api/voter/register:
 *   post:
 *     summary: 유권자 등록
 *     description: |
 *       지갑 주소를 기반으로 identity nullifier와 trapdoor를 생성하여 등록합니다.
 *
 *       이미 등록된 경우 기존 identity를 반환합니다.
 *
 *       생성된 identity는 ZKP 증명 생성에 사용됩니다.
 *     tags: [Voter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *             properties:
 *               address:
 *                 type: string
 *                 pattern: "^0x[a-fA-F0-9]{40}$"
 *                 description: 지갑 주소
 *                 example: "0x1234567890123456789012345678901234567890"
 *     responses:
 *       200:
 *         description: 유권자 등록 성공 (또는 기존 identity 반환)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 identityNullifier:
 *                   type: string
 *                   description: Identity Nullifier (256비트 BigInt 문자열)
 *                   example: "1234567890123456789012345678901234567890123456789012345678901234"
 *                 identityTrapdoor:
 *                   type: string
 *                   description: Identity Trapdoor (256비트 BigInt 문자열)
 *                   example: "9876543210987654321098765432109876543210987654321098765432109876"
 *       400:
 *         description: 지갑 주소 누락 또는 형식 오류
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
import dbConnect from '@/lib/dbConnect'
import Voter from '@/models/Voter'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  let normalizedAddress: string | null = null

  try {
    const body = await request.json()
    const { address } = body

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_ADDRESS', message: '지갑 주소가 필요합니다.' },
        { status: 400 }
      )
    }

    // 주소 정규화 (소문자)
    normalizedAddress = address.toLowerCase()

    // DB 연결
    await dbConnect()

    // 이미 등록된 투표자 확인
    let voter = await Voter.findOne({ walletAddress: normalizedAddress })

    if (voter) {
      // 이미 등록된 경우 기존 identity 반환
      return NextResponse.json({
        identityNullifier: voter.identityNullifier || generateRandomBigInt(),
        identityTrapdoor: voter.identityTrapdoor || generateRandomBigInt(),
      })
    }

    // 새 identity 생성 (랜덤 BigInt)
    const identityNullifier = generateRandomBigInt()
    const identityTrapdoor = generateRandomBigInt()

    // DB에 저장
    voter = await Voter.create({
      walletAddress: normalizedAddress,
      identityNullifier: identityNullifier.toString(),
      identityTrapdoor: identityTrapdoor.toString(),
    })

    return NextResponse.json({
      identityNullifier: identityNullifier.toString(),
      identityTrapdoor: identityTrapdoor.toString(),
    })
  } catch (error: unknown) {
    const err = error as { message?: string; code?: number }
    const { error: logError } = await import('@/lib/logger')
    logError('[Voter] Register error:', err)

    // 중복 키 에러 (이미 존재하는 경우)
    if (err.code === 11000 && normalizedAddress) {
      // 다시 조회해서 반환
      try {
        await dbConnect()
        const voter = await Voter.findOne({
          walletAddress: normalizedAddress,
        })
        if (voter) {
          return NextResponse.json({
            identityNullifier:
              voter.identityNullifier || generateRandomBigInt(),
            identityTrapdoor: voter.identityTrapdoor || generateRandomBigInt(),
          })
        }
      } catch (retryError) {
        const { error: logError } = await import('@/lib/logger')
        logError('[Voter] Retry error:', retryError)
      }
    }

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: '투표자 등록 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

/**
 * 랜덤 BigInt 생성 (256비트)
 */
function generateRandomBigInt(): string {
  // 32바이트 (256비트) 랜덤 생성
  const randomBytes = crypto.randomBytes(32)
  // BigInt로 변환 (양수로)
  const bigInt = BigInt('0x' + randomBytes.toString('hex'))
  return bigInt.toString()
}
