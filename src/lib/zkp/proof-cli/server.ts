/**
 * ZKP Proof 생성 서버 (WSL/Pi용)
 *
 * 느린 기기를 위한 Proof 생성 오프로딩 서버
 *
 * 사용법:
 *   npx ts-node src/lib/zkp/proof-cli/server.ts --port 8787
 */

import express from 'express'
import cors from 'cors'
import * as snarkjs from 'snarkjs'
import * as fs from 'fs'
import * as path from 'path'
import minimist from 'minimist'

const argv = minimist(process.argv.slice(2))

const PORT = argv.port || process.env.PROOF_SERVER_PORT || 8787
const WASM_PATH = argv.wasm || 'build/v1.2/vote_js/vote.wasm'
const ZKEY_PATH = argv.zkey || 'build/v1.2/vote_final.zkey'
const VERBOSE = argv.verbose || false

// Express 앱 설정
const app = express()

// CORS 설정 (개발/프로덕션 환경 대응)
const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    // origin이 없으면 (같은 도메인 또는 Postman 등) 허용
    if (!origin) {
      return callback(null, true)
    }

    // localhost, Vercel 도메인 허용
    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('.vercel.app') ||
      origin.includes('vercel.app')
    ) {
      return callback(null, true)
    }

    // 기타 origin은 거부
    callback(new Error('CORS 정책에 의해 차단되었습니다.'))
  },
  credentials: true,
}

app.use(cors(corsOptions))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// 서버 시작 시간
const startTime = Date.now()

// 상태 확인
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'zkp-proof-server',
    version: 'v1.2',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    wasm: path.basename(WASM_PATH),
    zkey: path.basename(ZKEY_PATH),
  })
})

// 증명 생성 API
app.post('/prove', async (req, res) => {
  const started = Date.now()

  try {
    const { vote, pollId, nullifierSecret, merkleProof, salt } = req.body

    // 입력 검증
    if (
      vote === undefined ||
      pollId === undefined ||
      !nullifierSecret ||
      !merkleProof
    ) {
      return res.status(400).json({
        ok: false,
        error:
          'Missing required fields: vote, pollId, nullifierSecret, merkleProof',
      })
    }

    if (VERBOSE) {
      console.log(
        `[Proof Server] Generating proof for pollId=${pollId}, vote=${vote}`
      )
    }

    // salt가 없으면 랜덤 생성
    const voteSalt = salt || BigInt(Math.floor(Math.random() * 1e15))

    // 회로 입력 구성
    const input = {
      vote,
      voteBit0: vote & 1,
      voteBit1: (vote >> 1) & 1,
      voteBit2: (vote >> 2) & 1,
      salt: voteSalt.toString(),
      nullifierSecret: BigInt(nullifierSecret).toString(),
      /**
       * pathElements와 pathIndices를 BigInt 문자열로 변환
       * 입력은 string, number, bigint 중 하나일 수 있음
       */
      pathElements: merkleProof.pathElements.map((e: string | number | bigint) =>
        BigInt(e).toString()
      ),
      pathIndex: merkleProof.pathIndices.map((i: string | number | bigint) => BigInt(i).toString()),
      pollId: BigInt(pollId).toString(),
    }

    if (VERBOSE) {
      console.log('[Proof Server] Input prepared')
    }

    // snarkjs로 증명 생성
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      WASM_PATH,
      ZKEY_PATH
    )

    const elapsed = Date.now() - started

    if (VERBOSE) {
      console.log(`[Proof Server] ✅ Proof generated in ${elapsed}ms`)
    }

    res.json({
      ok: true,
      proof,
      publicSignals,
      timeMs: elapsed,
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    const elapsed = Date.now() - started

    console.error('[Proof Server] ❌ Error:', err.message)

    res.status(500).json({
      ok: false,
      error: err.message || 'Proof generation failed',
      timeMs: elapsed,
    })
  }
})

// 서버 시작
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║       🔐 ZKP Proof Server v1.2 (VoteZK)                   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

✅ 서버 시작 완료!

📡 API 엔드포인트:
   - POST http://localhost:${PORT}/prove
   - GET  http://localhost:${PORT}/health

📁 ZKP 파일:
   - WASM: ${WASM_PATH}
   - ZKEY: ${ZKEY_PATH}

🔧 설정:
   - Verbose: ${VERBOSE ? 'ON' : 'OFF'}
   - CORS: Enabled

🚀 준비 완료! 요청을 기다리는 중...
  `)

  // 파일 존재 확인
  if (!fs.existsSync(WASM_PATH)) {
    console.error(`❌ WASM 파일이 없습니다: ${WASM_PATH}`)
    process.exit(1)
  }

  if (!fs.existsSync(ZKEY_PATH)) {
    console.error(`❌ ZKEY 파일이 없습니다: ${ZKEY_PATH}`)
    process.exit(1)
  }

  console.log('✅ ZKP 파일 검증 완료\n')
})

// 종료 처리
process.on('SIGINT', () => {
  console.log('\n🛑 서버 종료 중...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 서버 종료 중...')
  process.exit(0)
})
