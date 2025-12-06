/**
 * 투표 제출 로직을 별도 파일로 분리
 *
 * 이 모듈은 ZKP 기반 투표 제출의 전체 흐름을 처리합니다:
 * 1. 투표자 등록 (identity nullifier/trapdoor 생성)
 * 2. 투표 정보 불러오기
 * 3. Merkle proof 생성 요청
 * 4. ZKP 증명 생성 (Web Worker)
 * 5. Relayer를 통한 블록체인 제출
 *
 * @module voteSubmission
 */

import { ensureRegistered } from '@/lib/voter'
import { PollPublic } from '@/lib/api'

interface VoteSubmissionParams {
  pollId: string
  selectedOption: string
  pollData: PollPublic | null
  address: string
  relayerEnabled: boolean
  generateProofInWorker: (message: {
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
  }) => Promise<{
    ok: boolean
    proof: string
    publicSignals: unknown
    error?: string
  }>
  onStatusChange: (status: string, message: string) => void
  onProgress?: (message: string) => void
}

export async function submitVote({
  pollId,
  selectedOption,
  pollData,
  address,
  relayerEnabled,
  generateProofInWorker,
  onStatusChange,
  onProgress,
}: VoteSubmissionParams): Promise<{
  success: boolean
  txHash?: string
  publicSignals?: unknown
  isReVote?: boolean
  error?: string
}> {
  /**
   * 1단계: 투표자 등록
   * 
   * ensureRegistered()가 자동으로:
   * - localStorage에서 identity 조회
   * - 없으면 백엔드에 등록 요청하고 저장
   * 
   * 반환값: { identityNullifier, identityTrapdoor }
   * - identityNullifier: nullifier 생성에 사용 (익명성 보장)
   * - identityTrapdoor: vote commitment 생성에 사용 (선택값 숨김)
   */
  onStatusChange('registering', '투표자 등록 중...')
  const identity = await ensureRegistered(address)
  const { identityNullifier, identityTrapdoor } = identity

  /**
   * 2단계: 투표 정보 불러오기
   * 
   * 공개 투표 정보를 가져와서 후보 목록과 설정을 확인합니다.
   */
  onStatusChange('connecting', '투표 정보 불러오는 중...')
  const { getApiUrl } = await import('@/lib/api-utils')
  const pollRes = await fetch(getApiUrl(`/api/vote/${pollId}/public`)).then(
    (r) => r.json()
  )

  if (!pollRes.success || !pollRes.poll) {
    throw new Error('투표 정보를 가져올 수 없습니다.')
  }

  /**
   * 3단계: Merkle proof 생성
   * 
   * 유권자가 투표할 자격이 있는지 증명하기 위한 Merkle proof를 생성합니다.
   * 백엔드에서 Merkle tree의 pathElements와 pathIndices를 반환합니다.
   */
  onProgress?.('Merkle proof 생성 중...')
  const merkleProofUrl = getApiUrl(
    `/api/vote/${pollId}/merkle-proof?identityNullifier=${encodeURIComponent(
      identityNullifier
    )}`
  )

  const merkleProofRes = await fetch(merkleProofUrl).then(async (r) => {
    if (!r.ok) {
      const errorText = await r.text()
      throw new Error(`Merkle proof 생성 실패: ${r.status} ${errorText}`)
    }
    return r.json()
  })

  if (!merkleProofRes.success || !merkleProofRes.merkleProof) {
    throw new Error(
      'Merkle proof를 생성할 수 없습니다. 투표가 아직 시작되지 않았거나 설정이 잘못되었습니다.'
    )
  }

  const { root, merkleProof } = merkleProofRes
  const { pathElements, pathIndices } = merkleProof

  /**
   * 4단계: 후보 선택값을 인덱스로 변환
   * 
   * UI에서 선택한 후보 ID를 ZKP 회로에서 사용할 인덱스(0부터 시작)로 변환합니다.
   */
  const optionIndex =
    pollData?.candidates.findIndex((c) => c.id === selectedOption) ?? 0

  /**
   * 5단계: pollId를 숫자로 변환
   * 
   * UUID 형식의 pollId를 온체인에서 사용할 숫자로 변환합니다.
   * UUID의 첫 8자리(hex)를 parseInt로 변환합니다.
   */
  const pollIdNumeric = parseInt(pollId.substring(0, 8), 16)

  /**
   * 6단계: Worker용 input 구성
   * 
   * ZKP 증명 생성을 위해 Web Worker에 전달할 payload를 구성합니다.
   * BigInt 값들은 문자열로 변환하여 전송합니다 (JSON 직렬화 가능하도록).
   */
  const workerPayload = {
    vote: optionIndex,
    pollId: pollIdNumeric,
    nullifierSecret: identityNullifier.toString(), // BigInt → string
    merkleProof: {
      pathElements: pathElements.map((e: bigint) => e.toString()), // BigInt[] → string[]
      pathIndices: pathIndices.map((i: bigint) => Number(i)), // BigInt[] → number[]
    },
    salt: identityTrapdoor.toString(), // BigInt → string
  }

  /**
   * 7단계: ZKP 증명 생성 (Web Worker)
   * 
   * Web Worker에서 snarkjs.groth16.fullProve()를 호출하여 ZKP 증명을 생성합니다.
   * - vote.wasm 파일 로드 (약 2.3MB)
   * - vote_final.zkey 파일 로드 (약 52.8MB)
   * - 증명 생성 (약 10-30초 소요)
   * 
   * 반환값:
   * - proof: Groth16 증명 (pi_a, pi_b, pi_c)
   * - publicSignals: [merkleRoot, pollId, nullifier, voteCommitment]
   */
  onStatusChange('generating-proof', 'ZKP 증명 생성 중... (10~30초 소요될 수 있습니다)')
  
  // 진행 상황 업데이트 (20초마다 - 사용자에게 진행 중임을 알림)
  const progressUpdate = setInterval(() => {
    onProgress?.('ZKP 증명 생성 중... (계속 진행 중입니다. ZKEY 파일이 크므로 시간이 걸릴 수 있습니다)')
  }, 20000)

  let proofJsonStr: string | Record<string, unknown>
  let publicSignals: unknown

  try {
    const proofResult = await generateProofInWorker({
      type: 'generate',
      payload: workerPayload,
    })
    clearInterval(progressUpdate)

    if (!proofResult.ok) {
      throw new Error(proofResult.error || 'Proof generation failed')
    }

    proofJsonStr = proofResult.proof
    publicSignals = proofResult.publicSignals
  } catch (proofError: unknown) {
    clearInterval(progressUpdate)
    throw proofError
  }

  /**
   * 8단계: Relayer를 통한 블록체인 제출
   * 
   * Relayer가 가스비를 대납하여 사용자에게 가스비 부담이 없도록 합니다.
   * 
   * Proof 형식 변환:
   * - Worker 반환 형식: { pi_a, pi_b, pi_c } 또는 { a, b, c }
   * - Relayer API 기대 형식: { a, b, c }
   */
  if (!relayerEnabled) {
    throw new Error('직접 전송 기능은 아직 구현되지 않았습니다.')
  }

  onStatusChange('submitting', '블록체인에 투표 전송 중...')

  // Proof 형식 변환 (Worker 형식 → Relayer 형식)
  const proofObj: {
    pi_a?: [string, string]
    pi_b?: [[string, string], [string, string]]
    pi_c?: [string, string]
    a?: [string, string]
    b?: [[string, string], [string, string]]
    c?: [string, string]
  } =
    typeof proofJsonStr === 'string'
      ? (JSON.parse(proofJsonStr) as typeof proofObj)
      : (proofJsonStr as typeof proofObj)

  const progressInterval = setInterval(() => {
    onProgress?.('계속 진행 중입니다. 블록체인 확인을 기다리는 중...')
  }, 30000)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
    clearInterval(progressInterval)
  }, 6 * 60 * 1000)

  try {
    const relayerRes = await fetch('/api/relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        pollId: pollId,
        proposalId: optionIndex,
        proof: {
          a: proofObj.pi_a
            ? [proofObj.pi_a[0], proofObj.pi_a[1]]
            : proofObj.a,
          b: proofObj.pi_b
            ? [
                [proofObj.pi_b[0][1], proofObj.pi_b[0][0]],
                [proofObj.pi_b[1][1], proofObj.pi_b[1][0]],
              ]
            : proofObj.b,
          c: proofObj.pi_c
            ? [proofObj.pi_c[0], proofObj.pi_c[1]]
            : proofObj.c,
        },
        publicSignals: publicSignals,
        voterAddress: address,
      }),
    }).then((r) => r.json())

    clearTimeout(timeoutId)
    clearInterval(progressInterval)

    if (!relayerRes.success) {
      throw new Error(
        relayerRes.message || relayerRes.error || 'Relayer 오류'
      )
    }

    // 재투표 여부는 백엔드에서 반환한 값 사용
    // 백엔드가 existingVote를 확인하여 정확한 재투표 여부를 판단
    const isReVote = relayerRes.isReVote === true

    return {
      success: true,
      txHash: relayerRes.txHash,
      publicSignals,
      isReVote,
    }
  } catch (fetchError: unknown) {
    clearTimeout(timeoutId)
    clearInterval(progressInterval)

    const err = fetchError as { name?: string; message?: string }
    if (err.name === 'AbortError') {
      throw new Error(
        '요청 시간이 초과되었습니다. 트랜잭션이 전송되었을 수 있으니 잠시 후 다시 확인해주세요.'
      )
    }
    throw fetchError
  }
}

