// import * as snarkjs from 'snarkjs'

// /** 프론트에서 증명 생성 (공개신호 없음) */
// export async function generateVoteProof(vote: 0 | 1) {
//   const wasmPath = '/zkp/example.wasm' // public/zkp/ 경로
//   const zkeyPath = '/zkp/example_final.zkey' // public/zkp/ 경로

//   const input = { vote } // 0 또는 1만 허용 (회로 제약)

//   const { proof, publicSignals } = await snarkjs.groth16.fullProve(
//     input,
//     wasmPath,
//     zkeyPath
//   )

//   console.log('publicSignals:', publicSignals) // 항상 []

//   // Solidity용 호출 데이터 변환
//   const calldata = await snarkjs.groth16.exportSolidityCallData(
//     proof,
//     publicSignals
//   )
//   const [A, B, C, Input] = JSON.parse(`[${calldata}]`)

//   const a: [string, string] = [A[0], A[1]]
//   const b: [[string, string], [string, string]] = [
//     [B[0][0], B[0][1]],
//     [B[1][0], B[1][1]],
//   ]
//   const c: [string, string] = [C[0], C[1]]
//   const inputSignals: string[] = Input // 현재 회로는 []

//   return { a, b, c, inputSignals, proof }
// }

// src/lib/zkp.ts
import * as snarkjs from 'snarkjs'

/**
 * ZKP v1.2 증명 생성
 * @param vote 후보 ID (0-7)
 * @param pollId 투표 ID
 * @param nullifierSecret 사용자 고유 비밀값
 * @param merkleProof Merkle 증명 (pathElements, pathIndices)
 * @param salt 랜덤 솔트
 */
export async function generateVoteProof(
  vote: number,
  pollId: string | number,
  nullifierSecret: string | bigint,
  merkleProof: {
    pathElements: (string | bigint)[]
    pathIndices: (number | bigint)[]
  },
  salt?: string | bigint
) {
  console.log('🔹 ZKP v1.2 증명 생성 시작:', { vote, pollId })

  // v1.2 파일 경로
  const wasmPath = '/zkp/v1.2/vote.wasm'
  const zkeyPath = '/zkp/v1.2/vote_final.zkey'

  // salt가 없으면 랜덤 생성
  const voteSalt = salt || BigInt(Math.floor(Math.random() * 1e15))

  // 회로 입력 구성
  const input = {
    vote,
    voteBit0: vote & 1,
    voteBit1: (vote >> 1) & 1,
    voteBit2: (vote >> 2) & 1,
    salt: voteSalt,
    nullifierSecret: BigInt(nullifierSecret),
    pathElements: merkleProof.pathElements.map((e) => BigInt(e)),
    pathIndex: merkleProof.pathIndices.map((i) => BigInt(i)),
    pollId: BigInt(pollId),
  }

  console.log('🔹 Circuit input prepared')

  /**
   * Groth16 증명 생성
   * 
   * 이 과정에서 약 1300개의 제약조건이 계산됩니다:
   * - Merkle Tree 검증 (pathElements, pathIndices)
   * - Nullifier 생성 (nullifierSecret 기반)
   * - Vote Commitment 생성 (vote + salt)
   * - Poll ID 검증
   * 
   * 소요 시간: 약 15초 (Web Worker에서 실행)
   */
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    wasmPath,
    zkeyPath
  )

  console.log('✅ Proof generated')
  console.log('publicSignals (v1.2):', publicSignals)
  // publicSignals = [root, pollId, nullifier, voteCommitment]

  // Solidity verifier에 보낼 calldata 변환
  const calldata = await snarkjs.groth16.exportSolidityCallData(
    proof,
    publicSignals
  )
  const [A, B, C, Input] = JSON.parse(`[${calldata}]`)

  // 타입 명시 (TS 경고 방지)
  const a: [string, string] = [A[0], A[1]]
  const b: [[string, string], [string, string]] = [
    [B[0][0], B[0][1]],
    [B[1][0], B[1][1]],
  ]
  const c: [string, string] = [C[0], C[1]]
  const inputSignals: string[] = Input

  return {
    a,
    b,
    c,
    inputSignals,
    proof,
    publicSignals,
    nullifier: publicSignals[2], // nullifier 추출
    voteCommitment: publicSignals[3], // voteCommitment 추출
  }
}
