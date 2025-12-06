/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: 헬스 체크
 *     description: |
 *       서버와 데이터베이스 연결 상태를 확인합니다.
 *
 *       **사용 용도**:
 *       - 모니터링 시스템에서 주기적으로 호출
 *       - 배포 후 서비스 상태 확인
 *       - 로드 밸런서 헬스 체크
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 서비스 정상
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 db:
 *                   type: string
 *                   example: "connected"
 *       500:
 *         description: 서비스 오류 (DB 연결 실패 등)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Database connection failed"
 */

import { NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'

export async function GET() {
  try {
    await dbConnect() // 성공 시 연결 보장
    return NextResponse.json({ ok: true, db: 'connected' }, { status: 200 })
  } catch (e: unknown) {
    const err = e as { message?: string }
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    )
  }
}
