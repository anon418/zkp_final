/**
 * ZKP v1.2 Proof Generation Worker
 * 브라우저 메인 스레드를 차단하지 않고 증명 생성
 */

import * as snarkjs from 'snarkjs'

// Worker 메시지 타입
interface ProofRequest {
  type: 'generate'
  payload: {
    vote: number
    pollId: string | number
    nullifierSecret: string | bigint
    merkleProof: {
      pathElements: (string | bigint)[]
      pathIndices: (number | bigint)[]
    }
    salt?: string | bigint
  }
}

/**
 * Groth16 증명 객체 타입
 * snarkjs.groth16.fullProve()의 반환 타입
 */
interface Groth16Proof {
  pi_a: [string, string]
  pi_b: [[string, string], [string, string]]
  pi_c: [string, string]
  protocol: string
  curve: string
}

interface ProofResponse {
  ok: boolean
  proof?: Groth16Proof | string // JSON 문자열 또는 객체
  publicSignals?: string[]
  error?: string
}

/**
 * Worker 메시지 핸들러
 * 두 가지 메시지 형식 지원:
 * 1. { type: 'generate', payload: {...} } - 새로운 형식
 * 2. { input: {...}, wasmPath: '...', zkeyPath: '...' } - 레거시 형식
 */
self.onmessage = async (e: MessageEvent<ProofRequest | { input?: unknown; wasmPath?: string; zkeyPath?: string }>) => {
  console.log('[Worker] Message received:', e.data)

  // 두 가지 형식 지원:
  // 1. { type: 'generate', payload: {...} }
  // 2. { input: {...}, wasmPath: '...', zkeyPath: '...' }

  let payload: ProofRequest['payload'] | undefined
  let wasmPath: string
  let zkeyPath: string

  if ('type' in e.data && e.data.type === 'generate' && 'payload' in e.data && e.data.payload) {
    // 형식 1
    payload = e.data.payload
    wasmPath = '/zkp/v1.2/vote.wasm'
    zkeyPath = '/zkp/v1.2/vote_final.zkey'
  } else if ('input' in e.data && e.data.input) {
    // 형식 2 (현재 프론트엔드에서 사용)
    const input = e.data.input as { payload?: ProofRequest['payload'] } | ProofRequest['payload']
    if (typeof input === 'object' && input !== null && 'payload' in input && input.payload) {
      payload = input.payload
    } else {
      payload = input as ProofRequest['payload']
    }
    wasmPath = e.data.wasmPath || '/zkp/v1.2/vote.wasm'
    zkeyPath = e.data.zkeyPath || '/zkp/v1.2/vote_final.zkey'
  } else {
    console.error('[Worker] Invalid message format:', e.data)
    self.postMessage({
      ok: false,
      error: 'Invalid message format',
    })
    return
  }

  if (!payload) {
    console.error('[Worker] Payload is missing')
    self.postMessage({
      ok: false,
      error: 'Payload is missing',
    })
    return
  }

  try {
    console.log(
      '[Worker] Starting proof generation for pollId:',
      payload.pollId
    )

    // salt가 없으면 랜덤 생성
    const voteSalt = payload.salt || BigInt(Math.floor(Math.random() * 1e15))

    // 회로 입력 구성
    const input = {
      vote: payload.vote,
      voteBit0: payload.vote & 1,
      voteBit1: (payload.vote >> 1) & 1,
      voteBit2: (payload.vote >> 2) & 1,
      salt: voteSalt,
      nullifierSecret: BigInt(payload.nullifierSecret),
      pathElements: payload.merkleProof.pathElements.map((e) => BigInt(e)),
      pathIndex: payload.merkleProof.pathIndices.map((i) => BigInt(i)),
      // pollId는 이미 숫자로 변환되어 있거나, UUID인 경우 변환 필요
      pollId:
        typeof payload.pollId === 'string' && payload.pollId.includes('-')
          ? BigInt(parseInt(payload.pollId.substring(0, 8), 16)) // UUID를 숫자로 변환
          : BigInt(payload.pollId), // 이미 숫자인 경우
    }

    console.log('[Worker] Circuit input prepared:', {
      vote: input.vote,
      pollId: input.pollId.toString(),
      pathElementsCount: input.pathElements.length,
      pathIndexCount: input.pathIndex.length,
    })

    // snarkjs로 증명 생성
    console.log('[Worker] Calling snarkjs.groth16.fullProve...')
    console.log('[Worker] WASM path:', wasmPath)
    console.log('[Worker] ZKEY path:', zkeyPath)
    console.log('[Worker] Input size check:', {
      pathElementsCount: input.pathElements.length,
      pathIndexCount: input.pathIndex.length,
    })

    // 진행 상황 업데이트를 위한 주기적 로그
    const progressInterval = setInterval(() => {
      console.log(
        '[Worker] Still generating proof... (this may take 10-30 seconds)'
      )
    }, 10000) // 10초마다

    try {
      const proofStartTime = Date.now()
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        wasmPath,
        zkeyPath
      )
      clearInterval(progressInterval)

      const proofDuration = Date.now() - proofStartTime

      console.log(`[Worker] Proof generated successfully in ${proofDuration}ms`)
      console.log('[Worker] publicSignals:', publicSignals)

      // 성공 응답
      const response: ProofResponse = {
        ok: true,
        proof,
        publicSignals,
      }

      self.postMessage(response)
    } catch (proveError: unknown) {
      clearInterval(progressInterval)
      throw proveError // 상위 catch로 전달
    }
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string; stack?: string }
    console.error('[Worker] Proof generation failed:', error)
    console.error('[Worker] Error name:', err.name)
    console.error('[Worker] Error stack:', err.stack)

    // 메모리 부족 오류 특별 처리
    if (
      err.message?.includes('Array buffer allocation') ||
      err.message?.includes('allocation failed') ||
      err.name === 'RangeError'
    ) {
      console.error(
        '[Worker] Memory allocation failed - this may be due to large ZKEY file'
      )
      const response: ProofResponse = {
        ok: false,
        error:
          '메모리 부족 오류가 발생했습니다. 브라우저를 새로고침하고 다시 시도해주세요. (ZKEY 파일이 매우 큽니다)',
      }
      self.postMessage(response)
      return
    }

    // 타임아웃 또는 기타 오류
    const response: ProofResponse = {
      ok: false,
      error: err.message || 'Unknown error',
    }

    self.postMessage(response)
  }
}

// TypeScript를 위한 export (실제 Worker에서는 사용되지 않음)
export {}
