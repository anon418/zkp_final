/**
 * Web Worker를 통한 ZKP 증명 생성 유틸리티
 * 
 * 이 모듈은 브라우저의 Web Worker를 사용하여 ZKP 증명 생성을 비동기로 처리합니다.
 * 메인 스레드를 블로킹하지 않고 무거운 계산 작업을 수행합니다.
 * 
 * 사용되는 파일:
 * - vote.wasm: Circom으로 컴파일된 WebAssembly 파일 (약 2.3MB)
 * - vote_final.zkey: Trusted Setup으로 생성된 proving key (약 52.8MB)
 * 
 * 증명 생성 시간: 약 10-30초 (기기 성능에 따라 다름)
 */

// WebWorker 로딩 (브라우저 환경에서만)
const proofWorker =
  typeof window !== 'undefined'
    ? new Worker(new URL('@/lib/proof.worker.ts', import.meta.url))
    : null

interface ProofRequest {
  type: 'generate'
  payload: {
    vote: number
    pollId: number
    nullifierSecret: string
    merkleProof: {
      pathElements: string[]
      pathIndices: number[]
    }
    salt: string
  }
}

interface ProofResponse {
  ok: boolean
  proof: string
  publicSignals: unknown
  error?: string
}

/**
 * Web Worker를 통해 ZKP 증명을 생성합니다.
 * 
 * @param message - 증명 생성 요청 (vote, pollId, nullifierSecret, merkleProof, salt)
 * @returns Promise<ProofResponse> - 증명 결과 (proof, publicSignals)
 * 
 * @throws Error - Worker 초기화 실패 또는 타임아웃 시
 */
export function generateProofInWorker(
  message: ProofRequest
): Promise<ProofResponse> {
  return new Promise<ProofResponse>((resolve, reject) => {
    if (!proofWorker) {
      console.error('[Vote] Worker 초기화 실패')
      return reject(new Error('Worker 초기화 실패'))
    }

    /**
     * 타임아웃 설정 (120초)
     * 
     * ZKEY 파일이 크고 증명 생성이 오래 걸릴 수 있으므로,
     * 충분한 시간을 제공하되 무한 대기는 방지합니다.
     */
    const timeout = setTimeout(() => {
      console.error('[Vote] ZKP proof generation timeout (120s)')
      reject(
        new Error(
          'ZKP 증명 생성 시간 초과 (120초). 브라우저를 새로고침하고 다시 시도해주세요.'
        )
      )
    }, 120000)

    proofWorker.onmessage = (
      event: MessageEvent<ProofResponse>
    ) => {
      clearTimeout(timeout)
      console.log('[Vote] Worker message received:', {
        ok: event.data.ok,
        hasProof: !!event.data.proof,
        error: event.data.error,
      })
      const data = event.data
      if (data.ok) return resolve(data)
      reject(new Error(data.error || 'Unknown error'))
    }

    proofWorker.onerror = (error) => {
      clearTimeout(timeout)
      // Worker 오류 객체는 일반적으로 빈 객체이므로, errorEvent의 속성을 확인
      const errorMessage = error?.message || error?.type || 'Unknown worker error'
      const errorDetails = {
        message: errorMessage,
        filename: error?.filename,
        lineno: error?.lineno,
        colno: error?.colno,
        error: error?.error,
      }
      console.error('[Vote] Worker error:', errorDetails)
      reject(new Error(`Worker 오류가 발생했습니다: ${errorMessage}`))
    }

    proofWorker.postMessage(message)
  })
}

